/**
 * Prueba de humo contra Stellar testnet: levanta la API compilada con el
 * driver `stellar`, crea cuentas con Friendbot y recorre el flujo completo
 * por HTTP (emitir, guardar, presentar, verificar, alterar y revocar).
 *
 * Uso: pnpm --filter api smoke:testnet (compila antes con `nest build`).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import type {
  CredencialEnBoveda,
  Desafio,
  Emision,
  EmisionFirmada,
  EmisionPreparada,
  Emisor,
  Plantilla,
  ResultadoVerificacion,
  RevocacionPreparada,
  Rol,
  Sesion,
} from '@repo/cliente';
import {
  bytesAFirmar,
  codificarPresentacion,
  crearPresentacion,
  firmarSep53ConSemilla,
  type FirmaMensaje,
} from '@repo/credenciales';
import { fundWithFriendbot, getNetworkConfig } from '@repo/stellar';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

const red = getNetworkConfig('testnet');
const raiz = join(dirname(new URL(import.meta.url).pathname), '..');

function paso(texto: string): void {
  console.log(`\n> ${texto}`);
}

function exigir(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(`Falló la comprobación: ${mensaje}`);
}

async function puertoLibre(): Promise<number> {
  return new Promise((resolve, reject) => {
    const servidor = createServer();
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => {
      const direccion = servidor.address();
      const puerto =
        typeof direccion === 'object' && direccion ? direccion.port : 0;
      servidor.close(() => resolve(puerto));
    });
  });
}

function levantarApi(puerto: number): {
  proceso: ChildProcess;
  salida: string[];
} {
  const salida: string[] = [];
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(puerto),
    STELLAR_NETWORK: 'testnet',
    ANCLAJE_DRIVER: 'stellar',
    DATABASE_PATH: ':memory:',
    GOBERNANZA_ABIERTA: 'true',
  };
  delete env.REDIS_URL;
  delete env.STELLAR_HORIZON_URL;
  const proceso = spawn(process.execPath, [join(raiz, 'dist/main.js')], {
    cwd: raiz,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proceso.stdout?.on('data', (dato: Buffer) => salida.push(dato.toString()));
  proceso.stderr?.on('data', (dato: Buffer) => salida.push(dato.toString()));
  return { proceso, salida };
}

async function esperarApi(base: string): Promise<void> {
  const limite = Date.now() + 30_000;
  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(`${base}/health`);
      if (respuesta.ok) return;
    } catch {
      // Todavía no escucha.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('La API no respondió en 30 segundos');
}

function crearCliente(base: string) {
  return async function pedir<T>(
    metodo: string,
    ruta: string,
    opciones: { cuerpo?: unknown; token?: string; esperado?: number } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opciones.cuerpo !== undefined)
      headers['Content-Type'] = 'application/json';
    if (opciones.token) headers.Authorization = `Bearer ${opciones.token}`;
    const respuesta = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers,
      body:
        opciones.cuerpo === undefined
          ? undefined
          : JSON.stringify(opciones.cuerpo),
    });
    const texto = await respuesta.text();
    const datos: unknown = texto ? JSON.parse(texto) : undefined;
    const esperado = opciones.esperado;
    if (
      esperado !== undefined ? respuesta.status !== esperado : !respuesta.ok
    ) {
      throw new Error(
        `${metodo} ${ruta} respondió ${respuesta.status}: ${texto}`,
      );
    }
    return datos as T;
  };
}

function firmarXdr(xdr: string, llave: Keypair): string {
  const tx = TransactionBuilder.fromXDR(xdr, red.passphrase);
  tx.sign(llave);
  return tx.toXDR();
}

function firmaCavos(llave: Keypair, mensaje: string): FirmaMensaje {
  return {
    esquema: 'cavos',
    publicKey: llave.publicKey(),
    firma: llave
      .sign(Buffer.from(bytesAFirmar('cavos', mensaje)))
      .toString('base64'),
  };
}

const enlaceTx = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

async function main(): Promise<void> {
  const puerto = await puertoLibre();
  const base = `http://127.0.0.1:${puerto}/api`;
  const { proceso, salida } = levantarApi(puerto);
  const pedir = crearCliente(base);

  try {
    await esperarApi(base);
    console.log(`API escuchando en ${base} (driver stellar, testnet)`);

    const emisorLlave = Keypair.random();
    const titularLlave = Keypair.random();
    const gobernanzaLlave = Keypair.random();
    const titularDid = `did:stellar:testnet:${titularLlave.publicKey()}`;

    paso('Fondeando cuentas con Friendbot');
    await Promise.all(
      [emisorLlave, titularLlave, gobernanzaLlave].map((llave) =>
        fundWithFriendbot(llave.publicKey(), red),
      ),
    );
    console.log(`  emisor     ${emisorLlave.publicKey()}`);
    console.log(`  titular    ${titularLlave.publicKey()}`);
    console.log(`  gobernanza ${gobernanzaLlave.publicKey()}`);

    async function sesion(
      llave: Keypair,
      rol: Rol,
      firmar: (mensaje: string) => FirmaMensaje = (mensaje) =>
        firmarSep53ConSemilla(llave.secret(), mensaje),
    ): Promise<Sesion> {
      const desafio = await pedir<Desafio>('POST', '/auth/desafios', {
        cuerpo: { address: llave.publicKey(), rol },
      });
      return pedir<Sesion>('POST', '/auth/sesiones', {
        cuerpo: {
          desafioId: desafio.desafioId,
          firma: firmar(desafio.mensaje),
        },
      });
    }

    paso('Emisor: inicia sesión (SEP-53) y registra su institución');
    const sesionEmisor = await sesion(emisorLlave, 'emisor');
    const emisor = await pedir<Emisor>('POST', '/emisores', {
      token: sesionEmisor.token,
      cuerpo: {
        nombre: 'Bootcamp Prueba de Humo',
        categoria: 'bootcamp',
        sitioWeb: null,
      },
    });
    exigir(emisor.estado === 'pendiente', 'el emisor nace pendiente');

    paso('Gobernanza: autoriza al emisor');
    const sesionGobernanza = await sesion(gobernanzaLlave, 'gobernanza');
    const autorizado = await pedir<Emisor>(
      'POST',
      `/emisores/${emisor.id}/estado`,
      {
        token: sesionGobernanza.token,
        cuerpo: { estado: 'autorizado', motivo: 'Prueba de humo en testnet' },
      },
    );
    exigir(autorizado.estado === 'autorizado', 'el emisor quedó autorizado');

    paso('Emisor: crea la plantilla');
    const plantilla = await pedir<Plantilla>('POST', '/plantillas', {
      token: sesionEmisor.token,
      cuerpo: {
        nombre: 'Fundamentos de Stellar',
        descripcion:
          'Curso introductorio sobre la red Stellar y credenciales verificables.',
        resultadosAprendizaje: [
          'Explica cómo funciona una cuenta Stellar',
          'Verifica una credencial anclada en la red',
        ],
        temasEvaluados: ['Cuentas', 'Transacciones'],
        contexto: {
          horas: 12,
          nivel: 'basico',
          modalidad: 'virtual',
          tipoAprendizaje: 'no_formal',
        },
        vigenciaMeses: 24,
      },
    });

    paso('Emisor: prepara, firma y ancla la credencial');
    const preparada = await pedir<EmisionPreparada>('POST', '/emisiones', {
      token: sesionEmisor.token,
      cuerpo: {
        plantillaId: plantilla.id,
        titularDid,
        calificacion: 'Aprobado',
      },
    });
    const firmada = await pedir<EmisionFirmada>(
      'POST',
      `/emisiones/${preparada.emision.id}/firma`,
      {
        token: sesionEmisor.token,
        cuerpo: {
          firma: firmarSep53ConSemilla(
            emisorLlave.secret(),
            preparada.mensajeAFirmar,
          ),
        },
      },
    );
    const emitida = await pedir<Emision>(
      'POST',
      `/emisiones/${preparada.emision.id}/envio`,
      {
        token: sesionEmisor.token,
        cuerpo: { signedXdr: firmarXdr(firmada.transaccion.xdr, emisorLlave) },
      },
    );
    exigir(
      emitida.estado === 'emitida' && emitida.txHash,
      'la credencial quedó emitida',
    );
    console.log(`  hash anclado ${emitida.hash}`);
    console.log(`  tx emisión   ${emitida.txHash}`);

    paso('Titular: inicia sesión (esquema Cavos) y lee su bóveda');
    const sesionTitular = await sesion(titularLlave, 'titular', (mensaje) =>
      firmaCavos(titularLlave, mensaje),
    );
    const boveda = await pedir<CredencialEnBoveda[]>('GET', '/boveda', {
      token: sesionTitular.token,
    });
    exigir(
      boveda.length === 1 && boveda[0]?.estado === 'valida',
      'la bóveda tiene la credencial',
    );
    const enBoveda = boveda[0]!;

    paso('Verificador: verifica la presentación (código del QR)');
    const presentacion = crearPresentacion(
      enBoveda.credencial,
      enBoveda.divulgaciones,
      ['resultadosAprendizaje', 'contexto'],
    );
    const codigo = await codificarPresentacion(presentacion);
    const valida = await pedir<ResultadoVerificacion>(
      'POST',
      '/verificaciones',
      {
        cuerpo: { codigo },
      },
    );
    exigir(
      valida.resultado === 'valida',
      `resultado válido (llegó ${valida.resultado})`,
    );
    console.log(`  resultado ${valida.resultado} en ${valida.duracionMs} ms`);
    exigir(
      valida.duracionMs < 10_000,
      'verificación en menos de 10 s (RNF-03)',
    );

    paso('Verificador: una credencial alterada no pasa');
    const alterada = structuredClone(presentacion);
    alterada.credencial.credentialSubject.logro.nombre = 'Doctorado en Stellar';
    const invalida = await pedir<ResultadoVerificacion>(
      'POST',
      '/verificaciones',
      {
        cuerpo: { presentacion: alterada },
      },
    );
    const firma = invalida.comprobaciones.find((c) => c.id === 'firma');
    exigir(
      invalida.resultado === 'invalida' && firma?.ok === false,
      'alterada es inválida por firma',
    );
    console.log(`  resultado ${invalida.resultado}: ${firma.detalle}`);

    paso('Emisor: revoca la credencial');
    const revocacion = await pedir<RevocacionPreparada>(
      'POST',
      `/emisiones/${preparada.emision.id}/revocacion`,
      { token: sesionEmisor.token, cuerpo: { motivo: 'Prueba de revocación' } },
    );
    const revocada = await pedir<Emision>(
      'POST',
      `/emisiones/${preparada.emision.id}/revocacion/envio`,
      {
        token: sesionEmisor.token,
        cuerpo: {
          signedXdr: firmarXdr(revocacion.transaccion.xdr, emisorLlave),
        },
      },
    );
    exigir(
      revocada.estado === 'revocada' && revocada.txRevocacion,
      'la credencial quedó revocada',
    );
    console.log(`  tx revocación ${revocada.txRevocacion}`);

    const trasRevocar = await pedir<ResultadoVerificacion>(
      'POST',
      '/verificaciones',
      {
        cuerpo: { codigo },
      },
    );
    exigir(
      trasRevocar.resultado === 'revocada',
      `revocada (llegó ${trasRevocar.resultado})`,
    );
    console.log(
      `  resultado ${trasRevocar.resultado} en ${trasRevocar.duracionMs} ms`,
    );

    console.log('\nResumen de la prueba de humo en testnet: todo correcto');
    console.log(`  Emisor        ${emisorLlave.publicKey()}`);
    console.log(`  Credencial    ${emitida.id}`);
    console.log(`  Emisión       ${enlaceTx(emitida.txHash)}`);
    console.log(`  Revocación    ${enlaceTx(revocada.txRevocacion)}`);
    console.log('  Verificación  válida -> alterada inválida -> revocada');
  } catch (error) {
    console.error(`\nLa prueba de humo falló: ${(error as Error).message}`);
    console.error('\nSalida de la API:\n' + salida.join(''));
    process.exitCode = 1;
  } finally {
    proceso.kill();
  }
}

await main();
