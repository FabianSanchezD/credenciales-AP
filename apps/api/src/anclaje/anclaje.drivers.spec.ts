import {
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  adjuntarPrueba,
  claveAnclaje,
  claveRevocacion,
  construirCredencial,
  estadoActa,
  estadoStellar,
  firmarSep53ConSemilla,
  hashCredencial,
  mensajeDeFirma,
  type CredencialFirmada,
} from '@repo/credenciales';
import {
  Keypair,
  NotFoundError,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { Transaction } from '@stellar/stellar-sdk';
import {
  CONTENIDO_PLANTILLA,
  TESTNET,
  stellarPrueba,
} from '../../test/soporte.js';
import type { StellarService } from '../stellar/stellar.service.js';
import { ActaAnclajeDriver, type ClienteActa } from './acta.driver.js';
import {
  StellarAnclajeDriver,
  estadoDesdeDatos,
  mensajeErrorStellar,
} from './stellar.driver.js';

const emisor = Keypair.random();
const titular = Keypair.random();
const vcId = crypto.randomUUID();

function credencialFirmada(
  estado = estadoActa('testnet', titular.publicKey(), vcId),
) {
  const { credencial } = construirCredencial({
    vcId,
    emisor: {
      did: `did:stellar:testnet:${emisor.publicKey()}`,
      nombre: 'Demo',
    },
    titularDid: `did:stellar:testnet:${titular.publicKey()}`,
    logro: { nombre: 'Curso', descripcion: 'Curso de prueba' },
    atributos: {
      resultadosAprendizaje: CONTENIDO_PLANTILLA.resultadosAprendizaje,
      temasEvaluados: [],
      contexto: CONTENIDO_PLANTILLA.contexto,
    },
    emitidaEn: new Date(),
    vigenciaMeses: null,
    estado,
  });
  return adjuntarPrueba(
    credencial,
    firmarSep53ConSemilla(emisor.secret(), mensajeDeFirma(credencial)),
  );
}

describe('StellarAnclajeDriver', () => {
  function driverCon(horizon: Record<string, unknown>) {
    const stellar = stellarPrueba() as unknown as Record<string, unknown>;
    stellar.horizon = horizon;
    return new StellarAnclajeDriver(stellar as unknown as StellarService);
  }

  it('prepara un manageData con el hash en la cuenta del emisor', async () => {
    const hashHex = 'ab'.repeat(32);
    const driver = driverCon({
      loadAccount: vi.fn(async (id: string) => ({
        accountId: () => id,
        sequenceNumber: () => '41',
      })),
      fetchBaseFee: vi.fn(async () => 100),
    });

    const { xdr, networkPassphrase } = await driver.prepararEmision({
      vcId,
      hashHex,
      credencial: credencialFirmada(),
      emisorAddress: emisor.publicKey(),
      titularAddress: titular.publicKey(),
    });

    expect(networkPassphrase).toBe(TESTNET.passphrase);
    const tx = TransactionBuilder.fromXDR(
      xdr,
      networkPassphrase,
    ) as Transaction;
    expect(tx.source).toBe(emisor.publicKey());
    expect(tx.sequence).toBe('42');
    const op = tx.operations[0] as Operation.ManageData;
    expect(op.type).toBe('manageData');
    expect(op.name).toBe(claveAnclaje(vcId));
    expect(Buffer.from(op.value!).toString('hex')).toBe(hashHex);
    expect(
      Number(tx.timeBounds!.maxTime) - Math.floor(Date.now() / 1000),
    ).toBeLessThanOrEqual(300);
  });

  it('prepara la revocación con la fecha en segundos', async () => {
    const driver = driverCon({
      loadAccount: vi.fn(async (id: string) => ({
        accountId: () => id,
        sequenceNumber: () => '1',
      })),
      fetchBaseFee: vi.fn(async () => 100),
    });
    const fecha = new Date('2026-11-18T12:00:00.000Z');

    const { xdr } = await driver.prepararRevocacion({
      vcId,
      emisorAddress: emisor.publicKey(),
      titularAddress: titular.publicKey(),
      fecha,
    });
    const op = (
      TransactionBuilder.fromXDR(xdr, TESTNET.passphrase) as Transaction
    ).operations[0] as Operation.ManageData;
    expect(op.name).toBe(claveRevocacion(vcId));
    expect(Buffer.from(op.value!).toString('ascii')).toBe(
      String(fecha.getTime() / 1000),
    );
  });

  it('informa si la cuenta del emisor no existe', async () => {
    const driver = driverCon({
      loadAccount: vi.fn(async () => {
        throw new NotFoundError('no existe', {});
      }),
    });
    await expect(
      driver.prepararEmision({
        vcId,
        hashHex: '00'.repeat(32),
        credencial: credencialFirmada(),
        emisorAddress: emisor.publicKey(),
        titularAddress: titular.publicKey(),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('lee el hash y la revocación desde las entradas de datos', async () => {
    const hash = Buffer.alloc(32, 7);
    const datos = {
      [claveAnclaje(vcId)]: hash.toString('base64'),
      [claveRevocacion(vcId)]: Buffer.from('1795003200').toString('base64'),
    };
    const driver = driverCon({
      accounts: () => ({
        accountId: () => ({ call: async () => ({ data_attr: datos }) }),
      }),
    });

    await expect(
      driver.consultar({
        estado: estadoStellar('testnet', emisor.publicKey(), vcId),
      }),
    ).resolves.toEqual({
      anclado: true,
      hashHex: hash.toString('hex'),
      revocadaEn: new Date(1795003200 * 1000).toISOString(),
    });
    expect(estadoDesdeDatos({}, vcId)).toEqual({
      anclado: false,
      hashHex: null,
      revocadaEn: null,
    });
  });

  it('traduce los códigos de error de Horizon', async () => {
    expect(
      mensajeErrorStellar({ transaction: 'tx_insufficient_balance' }),
    ).toMatch(/saldo suficiente/);
    expect(
      mensajeErrorStellar({
        transaction: 'tx_failed',
        operations: ['op_low_reserve'],
      }),
    ).toMatch(/reserva/);
    expect(mensajeErrorStellar({ transaction: 'tx_bad_seq' })).toMatch(
      /secuencia/,
    );
    expect(mensajeErrorStellar({ transaction: 'tx_raro' })).toMatch(/tx_raro/);

    const driver = driverCon({
      submitTransaction: vi.fn(async () => {
        throw Object.assign(new Error('Bad Request'), {
          response: {
            data: {
              extras: {
                result_codes: { transaction: 'tx_insufficient_balance' },
              },
            },
          },
        });
      }),
    });
    const tx = new TransactionBuilder(
      {
        accountId: () => emisor.publicKey(),
        sequenceNumber: () => '1',
        incrementSequenceNumber: () => {},
      } as never,
      { fee: '100', networkPassphrase: TESTNET.passphrase },
    )
      .addOperation(Operation.manageData({ name: 'x', value: 'y' }))
      .setTimeout(300)
      .build();
    await expect(driver.enviar(tx.toXDR(), 'emision')).rejects.toThrow(
      /saldo suficiente/,
    );
  });
});

describe('ActaAnclajeDriver', () => {
  type ClienteSimulado = ClienteActa & {
    [K in keyof ClienteActa]: ClienteActa[K] & ReturnType<typeof vi.fn>;
  };

  function clienteSimulado(): ClienteSimulado {
    return {
      vcIssue: vi.fn(async (payload: object) =>
        'signedXdr' in payload
          ? { tx_id: 'tx-emision' }
          : { xdr: 'XDR-EMISION', network: 'testnet' },
      ),
      revokeCredentialViaApi: vi.fn(async (payload: object) =>
        'signedXdr' in payload
          ? { tx_id: 'tx-revocacion' }
          : { xdr: 'XDR-REVOCACION', network: 'testnet' },
      ),
      vaultVerify: vi.fn(async () => ({ status: 'valid' as const })),
      vaultGetVcDirect: vi.fn(async () => ({ vc: undefined })),
    } as unknown as ClienteSimulado;
  }

  it('usa la bóveda del titular en credentialStatus', () => {
    const driver = new ActaAnclajeDriver(
      clienteSimulado(),
      'testnet',
      TESTNET.passphrase,
    );
    expect(
      driver.estadoCredencial({
        vcId,
        emisorAddress: emisor.publicKey(),
        titularAddress: titular.publicKey(),
      }),
    ).toEqual(estadoActa('testnet', titular.publicKey(), vcId));
  });

  it('prepara vcIssue con owner = titular, issuer = emisor y la credencial firmada', async () => {
    const cliente = clienteSimulado();
    const driver = new ActaAnclajeDriver(
      cliente,
      'testnet',
      TESTNET.passphrase,
    );
    const credencial = credencialFirmada();

    await expect(
      driver.prepararEmision({
        vcId,
        hashHex: hashCredencial(credencial),
        credencial,
        emisorAddress: emisor.publicKey(),
        titularAddress: titular.publicKey(),
      }),
    ).resolves.toEqual({
      xdr: 'XDR-EMISION',
      networkPassphrase: TESTNET.passphrase,
    });
    expect(cliente.vcIssue).toHaveBeenCalledWith({
      owner: titular.publicKey(),
      vcId,
      vcData: JSON.stringify(credencial),
      issuer: emisor.publicKey(),
      sourcePublicKey: emisor.publicKey(),
    });

    await expect(driver.enviar('FIRMADA', 'emision')).resolves.toEqual({
      txHash: 'tx-emision',
    });
    expect(cliente.vcIssue).toHaveBeenLastCalledWith({ signedXdr: 'FIRMADA' });
  });

  it('prepara y envía la revocación', async () => {
    const cliente = clienteSimulado();
    const driver = new ActaAnclajeDriver(
      cliente,
      'testnet',
      TESTNET.passphrase,
    );
    const fecha = new Date();

    await driver.prepararRevocacion({
      vcId,
      emisorAddress: emisor.publicKey(),
      titularAddress: titular.publicKey(),
      fecha,
    });
    expect(cliente.revokeCredentialViaApi).toHaveBeenCalledWith({
      owner: titular.publicKey(),
      vcId,
      date: fecha.toISOString(),
      sourcePublicKey: emisor.publicKey(),
    });
    await expect(driver.enviar('FIRMADA', 'revocacion')).resolves.toEqual({
      txHash: 'tx-revocacion',
    });
  });

  it('consulta el estado y recalcula el hash de la credencial guardada', async () => {
    const cliente = clienteSimulado();
    const credencial: CredencialFirmada = credencialFirmada();
    cliente.vaultGetVcDirect.mockResolvedValue({
      vc: JSON.stringify(credencial),
    });
    cliente.vaultVerify.mockResolvedValue({
      status: 'revoked',
      since: '2026-11-18T00:00:00.000Z',
    });
    const driver = new ActaAnclajeDriver(
      cliente,
      'testnet',
      TESTNET.passphrase,
    );

    await expect(
      driver.consultar({ estado: credencial.credentialStatus }),
    ).resolves.toEqual({
      anclado: true,
      hashHex: hashCredencial(credencial),
      revocadaEn: '2026-11-18T00:00:00.000Z',
    });
    expect(cliente.vaultVerify).toHaveBeenCalledWith({
      owner: titular.publicKey(),
      vcId,
    });

    // Otro tipo de anclaje: no se consulta ACTA.
    await expect(
      driver.consultar({
        estado: estadoStellar('testnet', emisor.publicKey(), vcId),
      }),
    ).resolves.toMatchObject({ anclado: false });
  });

  it('una credencial inexistente no está anclada y los errores se traducen', async () => {
    const cliente = clienteSimulado();
    cliente.vaultVerify.mockRejectedValue(
      Object.assign(new Error('Not found'), { status: 404 }),
    );
    const driver = new ActaAnclajeDriver(
      cliente,
      'testnet',
      TESTNET.passphrase,
    );
    await expect(
      driver.consultar({
        estado: estadoActa('testnet', titular.publicKey(), vcId),
      }),
    ).resolves.toMatchObject({ anclado: false });

    cliente.vcIssue.mockRejectedValue(
      Object.assign(new Error('Unauthorized'), { status: 401 }),
    );
    await expect(driver.enviar('X', 'emision')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    cliente.vcIssue.mockRejectedValue(
      Object.assign(new Error('Down'), { status: 503 }),
    );
    await expect(driver.enviar('X', 'emision')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
