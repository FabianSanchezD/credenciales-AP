import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CodigoEnviado, CorreoVerificado, Sesion } from '@repo/cliente';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { AlmacenTemporal } from '../almacen/almacen-temporal.js';
import { AuthService } from '../auth/auth.service.js';
import type { SesionActiva } from '../auth/sesion.js';
import type { Env } from '../config/env.js';
import type { Emisor } from '../emisores/emisor.entity.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import {
  HASH_SIN_CUENTA,
  hashContrasena,
  verificarContrasena,
} from './contrasenas.js';
import type { RegistroEmisor } from './cuenta.entity.js';
import { CuentasRepository, type DatosRegistro } from './cuentas.repository.js';
import type {
  CorregirRegistroDto,
  CrearCuentaDto,
  EnviarCodigoDto,
  IngresarDto,
  VerificarCodigoDto,
} from './cuentas.schemas.js';

export const TTL_CODIGO_SEGUNDOS = 10 * 60;
export const TTL_VERIFICACION_SEGUNDOS = 30 * 60;
export const MAX_INTENTOS_CODIGO = 5;

interface CodigoPendiente {
  hash: string;
  intentos: number;
  expiraEn: string;
}

const claveCodigo = (correo: string) => `codigo-correo:${correo}`;
const claveVerificacion = (id: string) => `correo-verificado:${id}`;
const hashCodigo = (correo: string, codigo: string) =>
  createHash('sha256').update(`${correo}:${codigo}`).digest('hex');

/**
 * Cuentas de institución con correo y contraseña. La cuenta se crea con la
 * wallet de Stellar de la institución (firma un desafío una vez); después se
 * entra con correo y contraseña y la wallet solo firma las emisiones.
 */
@Injectable()
export class CuentasService {
  private readonly logger = new Logger(CuentasService.name);
  private readonly produccion: boolean;

  constructor(
    private readonly repository: CuentasRepository,
    private readonly almacen: AlmacenTemporal,
    private readonly auth: AuthService,
    private readonly emisores: EmisoresService,
    config: ConfigService<Env, true>,
  ) {
    this.produccion = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /**
   * Genera un código de 6 dígitos para el correo. Mientras no haya envío de
   * correos, fuera de producción se devuelve en la respuesta y se registra.
   */
  async enviarCodigo({ correo }: EnviarCodigoDto): Promise<CodigoEnviado> {
    if (await this.repository.findByCorreo(correo)) {
      throw new ConflictException(
        'Ya existe una cuenta con ese correo. Inicia sesión.',
      );
    }
    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiraEn = new Date(
      Date.now() + TTL_CODIGO_SEGUNDOS * 1000,
    ).toISOString();
    const pendiente: CodigoPendiente = {
      hash: hashCodigo(correo, codigo),
      intentos: 0,
      expiraEn,
    };
    await this.almacen.set(
      claveCodigo(correo),
      JSON.stringify(pendiente),
      TTL_CODIGO_SEGUNDOS,
    );
    if (this.produccion) {
      this.logger.warn(
        'No hay envío de correos configurado: el código de verificación no llega a la institución',
      );
      return { expiraEn };
    }
    this.logger.log(`Código de verificación para ${correo}: ${codigo}`);
    return { expiraEn, codigoDesarrollo: codigo };
  }

  async verificarCodigo({
    correo,
    codigo,
  }: VerificarCodigoDto): Promise<CorreoVerificado> {
    const guardado = await this.almacen.get(claveCodigo(correo));
    if (!guardado) {
      throw new BadRequestException(
        'El código venció. Pide uno nuevo para verificar el correo.',
      );
    }
    const pendiente = JSON.parse(guardado) as CodigoPendiente;
    if (pendiente.hash !== hashCodigo(correo, codigo)) {
      const intentos = pendiente.intentos + 1;
      if (intentos >= MAX_INTENTOS_CODIGO) {
        await this.almacen.delete(claveCodigo(correo));
        throw new BadRequestException(
          'El código no coincide y se agotaron los intentos. Pide uno nuevo.',
        );
      }
      const restante = Math.max(
        1,
        Math.ceil((Date.parse(pendiente.expiraEn) - Date.now()) / 1000),
      );
      await this.almacen.set(
        claveCodigo(correo),
        JSON.stringify({ ...pendiente, intentos }),
        restante,
      );
      throw new BadRequestException(
        'El código no coincide. Revisa el correo e intenta de nuevo.',
      );
    }
    await this.almacen.delete(claveCodigo(correo));
    const verificacionId = randomBytes(24).toString('base64url');
    const expiraEn = new Date(
      Date.now() + TTL_VERIFICACION_SEGUNDOS * 1000,
    ).toISOString();
    await this.almacen.set(
      claveVerificacion(verificacionId),
      correo,
      TTL_VERIFICACION_SEGUNDOS,
    );
    return { verificacionId, expiraEn };
  }

  /** Crea la institución (pendiente de revisión), su cuenta y abre sesión. */
  async crear(dto: CrearCuentaDto): Promise<Sesion> {
    const { institucion, representante } = dto;
    const correoVerificado = await this.almacen.get(
      claveVerificacion(dto.verificacionId),
    );
    if (correoVerificado !== institucion.correo) {
      throw new BadRequestException(
        'Verifica el correo institucional antes de crear la cuenta.',
      );
    }
    if (await this.repository.findByCorreo(institucion.correo)) {
      throw new ConflictException(
        'Ya existe una cuenta con ese correo. Inicia sesión.',
      );
    }

    const desafio = await this.auth.consumirDesafio(dto.desafioId, dto.firma);
    if (desafio.rol !== 'emisor') {
      throw new BadRequestException(
        'La wallet debe firmar el desafío como institución emisora',
      );
    }
    const hash = await hashContrasena(dto.contrasena);
    const emisor = await this.emisores.create(desafio.address, {
      nombre: institucion.nombre,
      categoria: institucion.categoria,
      sitioWeb: institucion.sitioWeb,
    });
    const ahora = new Date().toISOString();
    await this.repository.crear(
      {
        id: randomUUID(),
        correo: institucion.correo,
        hashContrasena: hash,
        emisorId: emisor.id,
        correoVerificadoEn: ahora,
        creadaEn: ahora,
      },
      {
        emisorId: emisor.id,
        institucion: {
          tipoIdentificacion: institucion.tipoIdentificacion,
          identificacion: institucion.identificacion,
          correo: institucion.correo,
          provincia: institucion.provincia,
        },
        representante,
        actualizadoEn: ahora,
      },
      dto.llaveCifrada,
    );
    await this.almacen.delete(claveVerificacion(dto.verificacionId));
    return this.auth.abrirSesion('emisor', desafio.address);
  }

  async ingresar({ correo, contrasena }: IngresarDto): Promise<Sesion> {
    const cuenta = await this.repository.findByCorreo(correo);
    const valida = await verificarContrasena(
      contrasena,
      cuenta?.hashContrasena ?? HASH_SIN_CUENTA,
    );
    if (!cuenta || !valida) {
      throw new UnauthorizedException(
        'El correo o la contraseña no coinciden.',
      );
    }
    const emisor = await this.emisores.findOne(cuenta.emisorId);
    return this.auth.abrirSesion('emisor', emisor.stellarAddress);
  }

  /** Llave de firma cifrada; solo el navegador con la contraseña la abre. */
  async miLlave(sesion: SesionActiva): Promise<{ llaveCifrada: string }> {
    const emisor = await this.emisores.delaCuenta(sesion.address);
    const llaveCifrada = await this.repository.findLlave(emisor.id);
    if (!llaveCifrada) {
      throw new NotFoundException(
        'Esta institución firma con su propia wallet, no con una llave guardada',
      );
    }
    return { llaveCifrada };
  }

  async miRegistro(sesion: SesionActiva): Promise<RegistroEmisor> {
    const emisor = await this.emisores.delaCuenta(sesion.address);
    return this.registroDe(emisor);
  }

  async registroPorId(emisorId: string): Promise<RegistroEmisor> {
    return this.registroDe(await this.emisores.findOne(emisorId));
  }

  /** Corrige los datos y devuelve la solicitud a revisión. */
  async corregir(
    sesion: SesionActiva,
    { institucion, representante }: CorregirRegistroDto,
  ): Promise<RegistroEmisor> {
    const actual = await this.emisores.delaCuenta(sesion.address);
    const registro = await this.repository.findRegistro(actual.id);
    if (!registro) {
      throw new ForbiddenException(
        'Esta institución no tiene una cuenta con datos de registro',
      );
    }
    const emisor = await this.emisores.reenviar(sesion.address, {
      nombre: institucion.nombre,
      categoria: institucion.categoria,
      sitioWeb: institucion.sitioWeb,
    });
    await this.repository.saveRegistro({
      emisorId: emisor.id,
      institucion: {
        tipoIdentificacion: institucion.tipoIdentificacion,
        identificacion: institucion.identificacion,
        correo: registro.institucion.correo,
        provincia: institucion.provincia,
      },
      representante,
      actualizadoEn: new Date().toISOString(),
    });
    return this.registroDe(emisor);
  }

  private async registroDe(emisor: Emisor): Promise<RegistroEmisor> {
    const [registro, cuenta] = await Promise.all([
      this.repository.findRegistro(emisor.id),
      this.repository.findByEmisor(emisor.id),
    ]);
    if (!registro || !cuenta) {
      throw new NotFoundException(
        'Esta institución se registró sin cuenta de correo y no tiene datos de registro',
      );
    }
    return componer(emisor, registro, cuenta.correoVerificadoEn);
  }
}

function componer(
  emisor: Emisor,
  registro: DatosRegistro,
  correoVerificadoEn: string,
): RegistroEmisor {
  return {
    emisorId: emisor.id,
    institucion: {
      nombre: emisor.nombre,
      categoria: emisor.categoria,
      sitioWeb: emisor.sitioWeb ?? '',
      ...registro.institucion,
    },
    representante: registro.representante,
    correoVerificadoEn,
    actualizadoEn: registro.actualizadoEn,
  };
}
