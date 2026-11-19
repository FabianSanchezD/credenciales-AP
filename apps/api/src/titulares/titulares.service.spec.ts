import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { stellarPrueba } from '../../test/soporte.js';
import { BaseDatosService } from '../database/base-datos.service.js';
import { SqliteEmisoresRepository } from '../emisores/emisores.repository.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import { SqliteTitularesRepository } from './titulares.repository.js';
import { TitularesService } from './titulares.service.js';

async function setup() {
  const bd = new BaseDatosService(':memory:');
  const stellar = stellarPrueba();
  const emisores = new EmisoresService(
    new SqliteEmisoresRepository(bd),
    stellar,
  );
  const cuentaEmisor = Keypair.random().publicKey();
  const emisor = await emisores.create(cuentaEmisor, {
    nombre: 'Bootcamp Demo',
    categoria: 'bootcamp',
  });
  const titulares = new TitularesService(
    new SqliteTitularesRepository(bd),
    emisores,
    stellar,
  );
  return { emisor, cuentaEmisor, titulares };
}

describe('TitularesService', () => {
  const address = Keypair.random().publicKey();
  const did = `did:stellar:testnet:${address}`;

  it('inscribe y lista los titulares de un emisor', async () => {
    const { emisor, cuentaEmisor, titulares } = await setup();

    const titular = await titulares.register(emisor.id, cuentaEmisor, { did });

    expect(titular).toMatchObject({
      emisorId: emisor.id,
      did,
      stellarAddress: address,
    });
    await expect(
      titulares.findByEmisor(emisor.id, cuentaEmisor),
    ).resolves.toEqual([titular]);
  });

  it('solo el emisor dueño ve y cambia sus titulares', async () => {
    const { emisor, titulares } = await setup();
    const otraCuenta = Keypair.random().publicKey();

    await expect(
      titulares.findByEmisor(emisor.id, otraCuenta),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      titulares.register(emisor.id, otraCuenta, { did }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no inscribe dos veces el mismo DID', async () => {
    const { emisor, cuentaEmisor, titulares } = await setup();
    await titulares.register(emisor.id, cuentaEmisor, { did });

    await expect(
      titulares.register(emisor.id, cuentaEmisor, { did }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza DIDs de otra red', async () => {
    const { emisor, cuentaEmisor, titulares } = await setup();

    await expect(
      titulares.register(emisor.id, cuentaEmisor, {
        did: `did:stellar:mainnet:${address}`,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('elimina un titular inscrito', async () => {
    const { emisor, cuentaEmisor, titulares } = await setup();
    const titular = await titulares.register(emisor.id, cuentaEmisor, { did });

    await titulares.remove(emisor.id, cuentaEmisor, titular.id);

    await expect(
      titulares.findByEmisor(emisor.id, cuentaEmisor),
    ).resolves.toEqual([]);
    await expect(
      titulares.remove(emisor.id, cuentaEmisor, titular.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falla si el emisor no existe', async () => {
    const { cuentaEmisor, titulares } = await setup();

    await expect(
      titulares.findByEmisor(crypto.randomUUID(), cuentaEmisor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
