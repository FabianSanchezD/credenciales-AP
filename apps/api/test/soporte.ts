import type { ConfigService } from '@nestjs/config';
import type { ContenidoPlantilla } from '@repo/credenciales';
import { getNetworkConfig, parseDidStellar, toDidStellar } from '@repo/stellar';
import {
  Keypair,
  TransactionBuilder,
  type Transaction,
} from '@stellar/stellar-sdk';
import { AlmacenTemporalMemoria } from '../src/almacen/almacen-temporal.js';
import { MemoriaAnclajeDriver } from '../src/anclaje/memoria.driver.js';
import { AuthService } from '../src/auth/auth.service.js';
import {
  BovedaRepository,
  SqliteBovedaRepository,
} from '../src/boveda/boveda.repository.js';
import { BovedaService } from '../src/boveda/boveda.service.js';
import { CifradoService } from '../src/boveda/cifrado.service.js';
import type { Env } from '../src/config/env.js';
import { BaseDatosService } from '../src/database/base-datos.service.js';
import { SqliteEmisionesRepository } from '../src/emisiones/emisiones.repository.js';
import { EmisionesService } from '../src/emisiones/emisiones.service.js';
import { SqliteEmisoresRepository } from '../src/emisores/emisores.repository.js';
import { EmisoresService } from '../src/emisores/emisores.service.js';
import { SqlitePlantillasRepository } from '../src/plantillas/plantillas.repository.js';
import { PlantillasService } from '../src/plantillas/plantillas.service.js';
import type {
  FirmantesCuenta,
  StellarService,
} from '../src/stellar/stellar.service.js';
import { VerificacionService } from '../src/verificacion/verificacion.service.js';

export const TESTNET = getNetworkConfig('testnet');

export function configPrueba(
  valores: Partial<Env> = {},
): ConfigService<Env, true> {
  const completos: Partial<Env> = {
    NODE_ENV: 'test',
    GOBERNANZA_CUENTAS: [],
    GOBERNANZA_ABIERTA: false,
    BOVEDA_CLAVE: 'c0ffee'.repeat(10) + 'c0ff',
    ...valores,
  };
  return {
    get: (clave: keyof Env) => completos[clave],
  } as unknown as ConfigService<Env, true>;
}

/** StellarService sin red: todas las cuentas existen salvo que se indique. */
export function stellarPrueba(
  opciones: {
    existe?: boolean;
    firmantes?: (address: string) => FirmantesCuenta;
  } = {},
) {
  const existe = opciones.existe ?? true;
  return {
    network: 'testnet',
    passphrase: TESTNET.passphrase,
    config: TESTNET,
    toDid: (address: string) => toDidStellar(address, 'testnet'),
    parseDid: (did: string) => {
      const parsed = parseDidStellar(did);
      return parsed?.network === 'testnet' ? parsed : null;
    },
    getAccount: vi.fn(async (address: string) => ({
      address,
      exists: existe,
      balanceXlm: existe ? '100' : '0',
    })),
    getFirmantes: vi.fn(async (address: string) =>
      opciones.firmantes
        ? opciones.firmantes(address)
        : { exists: existe, firmantes: [{ key: address, weight: 1 }] },
    ),
  } as unknown as StellarService;
}

export const CONTENIDO_PLANTILLA: ContenidoPlantilla = {
  nombre: 'Desarrollo web con TypeScript',
  descripcion: 'Curso práctico de desarrollo web moderno.',
  resultadosAprendizaje: [
    'Construye interfaces accesibles',
    'Diseña APIs HTTP con validación',
  ],
  temasEvaluados: ['HTML', 'TypeScript'],
  contexto: {
    horas: 40,
    nivel: 'intermedio',
    modalidad: 'virtual',
    tipoAprendizaje: 'no_formal',
  },
  vigenciaMeses: null,
};

/** Firma una transacción como lo haría la wallet del emisor. */
export function firmarXdr(xdr: string, llave: Keypair): string {
  const tx = TransactionBuilder.fromXDR(xdr, TESTNET.passphrase) as Transaction;
  tx.sign(llave);
  return tx.toXDR();
}

/** Arma todos los servicios sobre SQLite en memoria y el driver `memoria`. */
export function crearContexto(
  opciones: { stellar?: StellarService; config?: Partial<Env> } = {},
) {
  const bd = new BaseDatosService(':memory:');
  const config = configPrueba(opciones.config);
  const stellar = opciones.stellar ?? stellarPrueba();
  const anclaje = new MemoriaAnclajeDriver('testnet', TESTNET.passphrase);
  const emisores = new EmisoresService(
    new SqliteEmisoresRepository(bd),
    stellar,
  );
  const plantillas = new PlantillasService(
    new SqlitePlantillasRepository(bd),
    emisores,
  );
  const cifrado = new CifradoService(config);
  const bovedaRepository: BovedaRepository = new SqliteBovedaRepository(bd);
  const boveda = new BovedaService(bovedaRepository, cifrado, emisores);
  const emisiones = new EmisionesService(
    new SqliteEmisionesRepository(bd),
    emisores,
    plantillas,
    boveda,
    cifrado,
    anclaje,
    stellar,
  );
  const verificacion = new VerificacionService(anclaje, emisores);
  const auth = new AuthService(
    new AlmacenTemporalMemoria(),
    stellar,
    emisores,
    config,
  );
  return {
    bd,
    config,
    stellar,
    anclaje,
    emisores,
    plantillas,
    cifrado,
    boveda,
    emisiones,
    verificacion,
    auth,
  };
}

/** Emisor autorizado con una plantilla lista para emitir. */
export async function emisorAutorizado(ctx: ReturnType<typeof crearContexto>) {
  const llave = Keypair.random();
  const emisor = await ctx.emisores.create(llave.publicKey(), {
    nombre: 'Bootcamp Demo',
    categoria: 'bootcamp',
  });
  await ctx.emisores.cambiarEstado(emisor.id, {
    estado: 'autorizado',
    motivo: 'Cumple los requisitos',
  });
  const plantilla = await ctx.plantillas.crear(
    llave.publicKey(),
    CONTENIDO_PLANTILLA,
  );
  return { llave, emisor, plantilla };
}
