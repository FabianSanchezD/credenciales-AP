import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { firmarSep53ConSemilla } from '@repo/credenciales';
import { Keypair } from '@stellar/stellar-sdk';
import { configPrueba, crearContexto } from '../../test/soporte.js';
import { AlmacenTemporalMemoria } from '../almacen/almacen-temporal.js';
import { AuthService } from '../auth/auth.service.js';
import { SqliteCuentasRepository } from './cuentas.repository.js';
import { CuentasService } from './cuentas.service.js';
import type { CrearCuentaDto } from './cuentas.schemas.js';

const INSTITUCION = {
  nombre: 'Instituto de Ciencias Aplicadas de Ejemplo',
  categoria: 'universidad_publica',
  tipoIdentificacion: 'cedula_juridica',
  identificacion: '4-000-042069',
  correo: 'registro@ciencias-ejemplo.ac.cr',
  sitioWeb: 'https://ciencias-ejemplo.ac.cr',
  provincia: 'Cartago',
} as const;

const REPRESENTANTE = {
  nombre: 'María Fernanda Solano',
  tipoIdentificacion: 'cedula_fisica',
  identificacion: '1-1234-0567',
  cargo: 'Directora de Extensión',
  correo: 'msolano@ciencias-ejemplo.ac.cr',
  telefono: '2550-0000',
} as const;

const CONTRASENA = 'Segura#2026x';

function crearServicio() {
  const contexto = crearContexto();
  const almacen = new AlmacenTemporalMemoria();
  const config = configPrueba({ NODE_ENV: 'development' });
  const auth = new AuthService(
    almacen,
    contexto.stellar,
    contexto.emisores,
    config,
  );
  const cuentas = new CuentasService(
    new SqliteCuentasRepository(contexto.bd),
    almacen,
    auth,
    contexto.emisores,
    config,
  );
  return { ...contexto, auth, cuentas };
}

async function datosCuenta(
  servicio: ReturnType<typeof crearServicio>,
  llave = Keypair.random(),
): Promise<CrearCuentaDto> {
  const { cuentas, auth } = servicio;
  const { codigoDesarrollo } = await cuentas.enviarCodigo({
    correo: INSTITUCION.correo,
  });
  const { verificacionId } = await cuentas.verificarCodigo({
    correo: INSTITUCION.correo,
    codigo: codigoDesarrollo!,
  });
  const desafio = await auth.crearDesafio({
    address: llave.publicKey(),
    rol: 'emisor',
  });
  return {
    institucion: { ...INSTITUCION },
    representante: { ...REPRESENTANTE },
    contrasena: CONTRASENA,
    verificacionId,
    desafioId: desafio.desafioId,
    firma: firmarSep53ConSemilla(llave.secret(), desafio.mensaje),
    llaveCifrada: 'v1.c2Fs.aXY=.Y2lmcmFkbw==',
  };
}

describe('CuentasService', () => {
  it('crea la institución pendiente con su cuenta y abre sesión', async () => {
    const servicio = crearServicio();
    const llave = Keypair.random();
    const sesion = await servicio.cuentas.crear(
      await datosCuenta(servicio, llave),
    );
    expect(sesion).toMatchObject({
      rol: 'emisor',
      address: llave.publicKey(),
      emisor: {
        nombre: INSTITUCION.nombre,
        categoria: 'universidad_publica',
        estado: 'pendiente',
      },
    });

    const activa = await servicio.auth.sesionPorToken(sesion.token);
    const registro = await servicio.cuentas.miRegistro(activa!);
    expect(registro.institucion).toMatchObject(INSTITUCION);
    expect(registro.representante).toEqual(REPRESENTANTE);
    await expect(servicio.cuentas.miLlave(activa!)).resolves.toEqual({
      llaveCifrada: 'v1.c2Fs.aXY=.Y2lmcmFkbw==',
    });
  });

  it('entra con correo y contraseña, y rechaza una contraseña incorrecta', async () => {
    const servicio = crearServicio();
    const llave = Keypair.random();
    await servicio.cuentas.crear(await datosCuenta(servicio, llave));

    const sesion = await servicio.cuentas.ingresar({
      correo: INSTITUCION.correo,
      contrasena: CONTRASENA,
    });
    expect(sesion.address).toBe(llave.publicKey());
    await expect(
      servicio.cuentas.ingresar({
        correo: INSTITUCION.correo,
        contrasena: 'Otra#20260000',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      servicio.cuentas.ingresar({
        correo: 'nadie@ejemplo.ac.cr',
        contrasena: CONTRASENA,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('exige verificar el correo y no repite cuentas', async () => {
    const servicio = crearServicio();
    const datos = await datosCuenta(servicio);
    await expect(
      servicio.cuentas.crear({ ...datos, verificacionId: 'x'.repeat(32) }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await servicio.cuentas.crear(await datosCuenta(servicio));
    await expect(
      servicio.cuentas.enviarCodigo({ correo: INSTITUCION.correo }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('agota el código tras varios intentos fallidos', async () => {
    const { cuentas } = crearServicio();
    const { codigoDesarrollo } = await cuentas.enviarCodigo({
      correo: INSTITUCION.correo,
    });
    const errado = codigoDesarrollo === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await expect(
        cuentas.verificarCodigo({ correo: INSTITUCION.correo, codigo: errado }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      cuentas.verificarCodigo({
        correo: INSTITUCION.correo,
        codigo: codigoDesarrollo!,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualiza los datos editables sin tocar los de la validación', async () => {
    const servicio = crearServicio();
    const sesion = await servicio.cuentas.crear(await datosCuenta(servicio));
    const activa = (await servicio.auth.sesionPorToken(sesion.token))!;
    const registro = await servicio.cuentas.actualizarDatos(activa, {
      sitioWeb: 'https://nuevo-ejemplo.ac.cr',
      provincia: 'Heredia',
      representante: {
        nombre: 'Ana Lucía Vargas',
        cargo: 'Rectora',
        correo: 'avargas@ciencias-ejemplo.ac.cr',
        telefono: '2260-0000',
      },
    });
    expect(registro.institucion).toMatchObject({
      nombre: INSTITUCION.nombre,
      identificacion: INSTITUCION.identificacion,
      sitioWeb: 'https://nuevo-ejemplo.ac.cr',
      provincia: 'Heredia',
    });
    expect(registro.representante).toMatchObject({
      nombre: 'Ana Lucía Vargas',
      identificacion: REPRESENTANTE.identificacion,
    });
  });

  it('cambia la contraseña con la actual y guarda la llave recifrada', async () => {
    const servicio = crearServicio();
    const sesion = await servicio.cuentas.crear(await datosCuenta(servicio));
    const activa = (await servicio.auth.sesionPorToken(sesion.token))!;
    await expect(
      servicio.cuentas.cambiarContrasena(activa, {
        actual: 'Incorrecta#2026',
        nueva: 'Nueva#Clave2026',
        llaveCifrada: 'v1.bnVldmE=.aXY=.Y2lmcmFkbw==',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await servicio.cuentas.cambiarContrasena(activa, {
      actual: CONTRASENA,
      nueva: 'Nueva#Clave2026',
      llaveCifrada: 'v1.bnVldmE=.aXY=.Y2lmcmFkbw==',
    });
    await expect(servicio.cuentas.miLlave(activa)).resolves.toEqual({
      llaveCifrada: 'v1.bnVldmE=.aXY=.Y2lmcmFkbw==',
    });
    await expect(
      servicio.cuentas.ingresar({
        correo: INSTITUCION.correo,
        contrasena: 'Nueva#Clave2026',
      }),
    ).resolves.toMatchObject({ rol: 'emisor' });
  });

  it('solo reenvía la solicitud cuando hay correcciones pendientes', async () => {
    const servicio = crearServicio();
    const sesion = await servicio.cuentas.crear(await datosCuenta(servicio));
    const activa = (await servicio.auth.sesionPorToken(sesion.token))!;
    const { correo: _correo, ...institucion } = INSTITUCION;
    const correccion = {
      institucion: { ...institucion, nombre: 'Instituto Corregido de Ejemplo' },
      representante: { ...REPRESENTANTE },
    };

    await expect(
      servicio.cuentas.corregir(activa, correccion),
    ).rejects.toBeInstanceOf(ConflictException);

    await servicio.emisores.cambiarEstado(sesion.emisor!.id, {
      estado: 'correcciones',
      motivo: 'Falta la personería jurídica',
    });
    const registro = await servicio.cuentas.corregir(activa, correccion);
    expect(registro.institucion.nombre).toBe('Instituto Corregido de Ejemplo');
    expect(registro.institucion.correo).toBe(INSTITUCION.correo);
    await expect(
      servicio.emisores.findOne(sesion.emisor!.id),
    ).resolves.toMatchObject({ estado: 'pendiente' });
  });
});
