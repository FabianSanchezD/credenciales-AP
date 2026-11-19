import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Desafio, Sesion, SesionSinToken } from '@repo/cliente';
import { verificarFirmaMensaje, type FirmaMensaje } from '@repo/credenciales';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AlmacenTemporal } from '../almacen/almacen-temporal.js';
import type { Env } from '../config/env.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import { StellarService } from '../stellar/stellar.service.js';
import type { CrearDesafioDto, CrearSesionDto } from './auth.schemas.js';
import type { DesafioPendiente, Rol, SesionActiva } from './sesion.js';

export const NOMBRE_APP = 'Credenciales AP';
export const TTL_DESAFIO_SEGUNDOS = 5 * 60;
export const TTL_SESION_SEGUNDOS = 8 * 60 * 60;

const ETIQUETA_ROL: Record<Rol, string> = {
  emisor: 'Institución emisora',
  titular: 'Titular',
  gobernanza: 'Entidad que autoriza',
};

const claveDesafio = (id: string) => `desafio:${id}`;
/** Solo se guarda el hash del token: una fuga del almacén no da acceso. */
const claveSesion = (token: string) =>
  `sesion:${createHash('sha256').update(token).digest('hex')}`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly cuentasGobernanza: Set<string>;
  private readonly gobernanzaAbierta: boolean;

  constructor(
    private readonly almacen: AlmacenTemporal,
    private readonly stellar: StellarService,
    private readonly emisores: EmisoresService,
    config: ConfigService<Env, true>,
  ) {
    this.cuentasGobernanza = new Set(
      config.get('GOBERNANZA_CUENTAS', { infer: true }),
    );
    this.gobernanzaAbierta = config.get('GOBERNANZA_ABIERTA', { infer: true });
    if (this.gobernanzaAbierta) {
      this.logger.warn(
        'GOBERNANZA_ABIERTA=true: cualquier cuenta puede entrar a la consola de gobernanza (solo desarrollo)',
      );
    }
  }

  async crearDesafio({ address, rol }: CrearDesafioDto): Promise<Desafio> {
    this.exigirGobernanza(rol, address);
    const desafioId = randomUUID();
    const expiraEn = new Date(
      Date.now() + TTL_DESAFIO_SEGUNDOS * 1000,
    ).toISOString();
    const mensaje = [
      `${NOMBRE_APP} solicita tu firma para iniciar sesión.`,
      '',
      `Rol: ${ETIQUETA_ROL[rol]} (${rol})`,
      `Cuenta: ${address}`,
      `Nonce: ${randomBytes(16).toString('hex')}`,
      `Vence: ${expiraEn}`,
      '',
      'Firmar este mensaje no autoriza pagos ni transacciones.',
    ].join('\n');

    const pendiente: DesafioPendiente = { rol, address, mensaje, expiraEn };
    await this.almacen.set(
      claveDesafio(desafioId),
      JSON.stringify(pendiente),
      TTL_DESAFIO_SEGUNDOS,
    );
    return { desafioId, mensaje, expiraEn };
  }

  async crearSesion({ desafioId, firma }: CrearSesionDto): Promise<Sesion> {
    const guardado = await this.almacen.get(claveDesafio(desafioId));
    if (!guardado) {
      throw new UnauthorizedException(
        'El desafío venció o ya se usó. Solicita uno nuevo.',
      );
    }
    // Cada desafío se usa una sola vez.
    await this.almacen.delete(claveDesafio(desafioId));
    const desafio = JSON.parse(guardado) as DesafioPendiente;
    if (Date.parse(desafio.expiraEn) <= Date.now()) {
      throw new UnauthorizedException('El desafío venció. Solicita uno nuevo.');
    }

    this.exigirGobernanza(desafio.rol, desafio.address);
    await this.verificarFirma(desafio, firma);

    const token = randomBytes(32).toString('base64url');
    const sesion: SesionActiva = {
      rol: desafio.rol,
      address: desafio.address,
      did: this.stellar.toDid(desafio.address),
      expiraEn: new Date(Date.now() + TTL_SESION_SEGUNDOS * 1000).toISOString(),
    };
    await this.almacen.set(
      claveSesion(token),
      JSON.stringify(sesion),
      TTL_SESION_SEGUNDOS,
    );
    return { token, ...(await this.describir(sesion)) };
  }

  async sesionPorToken(token: string): Promise<SesionActiva | null> {
    const guardada = await this.almacen.get(claveSesion(token));
    if (!guardada) return null;
    const sesion = JSON.parse(guardada) as SesionActiva;
    return Date.parse(sesion.expiraEn) > Date.now() ? sesion : null;
  }

  async describir(sesion: SesionActiva): Promise<SesionSinToken> {
    return {
      rol: sesion.rol,
      address: sesion.address,
      did: sesion.did,
      expiraEn: sesion.expiraEn,
      emisor:
        sesion.rol === 'emisor'
          ? await this.emisores.findByAddress(sesion.address)
          : null,
    };
  }

  async cerrarSesion(token: string): Promise<void> {
    await this.almacen.delete(claveSesion(token));
  }

  private exigirGobernanza(rol: Rol, address: string): void {
    if (rol !== 'gobernanza' || this.gobernanzaAbierta) return;
    if (!this.cuentasGobernanza.has(address)) {
      throw new ForbiddenException(
        'Esta cuenta no pertenece a la entidad que autoriza',
      );
    }
  }

  /**
   * - `sep53`: la llave que firma debe ser la cuenta.
   * - `cavos` (solo titulares): la llave es la cuenta o uno de sus firmantes
   *   con peso. Si la cuenta aún no existe on-chain (Cavos la crea de forma
   *   diferida) se acepta la llave de control (limitación, ADR 0002).
   */
  private async verificarFirma(
    desafio: DesafioPendiente,
    firma: FirmaMensaje,
  ): Promise<void> {
    if (!verificarFirmaMensaje(desafio.mensaje, firma)) {
      throw new UnauthorizedException(
        'La firma no es válida para el mensaje del desafío',
      );
    }
    if (firma.esquema === 'cavos' && desafio.rol !== 'titular') {
      throw new BadRequestException(
        'El esquema de firma de Cavos solo está disponible para titulares',
      );
    }
    if (firma.publicKey === desafio.address) return;
    if (firma.esquema === 'sep53') {
      throw new UnauthorizedException(
        'La firma debe hacerse con la misma cuenta que inicia sesión',
      );
    }

    let cuenta;
    try {
      cuenta = await this.stellar.getFirmantes(desafio.address);
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo consultar la cuenta en Stellar. Intenta de nuevo en un momento.',
      );
    }
    if (!cuenta.exists) return;
    const firmante = cuenta.firmantes.find((f) => f.key === firma.publicKey);
    if (!firmante || firmante.weight <= 0) {
      throw new UnauthorizedException(
        'La llave que firmó no está autorizada en la cuenta del titular',
      );
    }
  }
}
