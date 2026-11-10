import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { InMemoryEmisoresRepository } from '../emisores/emisores.repository.js';
import { EmisoresService } from '../emisores/emisores.service.js';
import type { StellarService } from '../stellar/stellar.service.js';
import { InMemoryTitularesRepository } from './titulares.repository.js';
import { TitularesService } from './titulares.service.js';

const stellar = {
  network: 'testnet',
  toDid: (address: string) => `did:stellar:testnet:${address}`,
  parseDid: (did: string) => {
    const [, , network, address] = did.split(':');
    return network === 'testnet' ? { did, network, address } : null;
  },
  getAccount: async (address: string) => ({
    address,
    exists: true,
    balanceXlm: '100',
  }),
} as unknown as StellarService;

async function setup() {
  const emisores = new EmisoresService(
    new InMemoryEmisoresRepository(),
    stellar,
  );
  const emisor = await emisores.create({
    nombre: 'Bootcamp Demo',
    categoria: 'bootcamp',
    stellarAddress: Keypair.random().publicKey(),
  });
  const titulares = new TitularesService(
    new InMemoryTitularesRepository(),
    emisores,
    stellar,
  );
  return { emisor, titulares };
}

describe('TitularesService', () => {
  const address = Keypair.random().publicKey();
  const did = `did:stellar:testnet:${address}`;

  it('inscribe y lista los titulares de un emisor', async () => {
    const { emisor, titulares } = await setup();

    const titular = await titulares.register(emisor.id, { did });

    expect(titular).toMatchObject({
      emisorId: emisor.id,
      did,
      stellarAddress: address,
    });
    await expect(titulares.findByEmisor(emisor.id)).resolves.toEqual([titular]);
  });

  it('no inscribe dos veces el mismo DID', async () => {
    const { emisor, titulares } = await setup();
    await titulares.register(emisor.id, { did });

    await expect(titulares.register(emisor.id, { did })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rechaza DIDs de otra red', async () => {
    const { emisor, titulares } = await setup();

    await expect(
      titulares.register(emisor.id, { did: `did:stellar:mainnet:${address}` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('elimina un titular inscrito', async () => {
    const { emisor, titulares } = await setup();
    const titular = await titulares.register(emisor.id, { did });

    await titulares.remove(emisor.id, titular.id);

    await expect(titulares.findByEmisor(emisor.id)).resolves.toEqual([]);
    await expect(
      titulares.remove(emisor.id, titular.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('falla si el emisor no existe', async () => {
    const { titulares } = await setup();

    await expect(
      titulares.findByEmisor(crypto.randomUUID()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
