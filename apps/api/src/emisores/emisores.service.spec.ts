import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import type { StellarService } from '../stellar/stellar.service.js';
import { InMemoryEmisoresRepository } from './emisores.repository.js';
import { EmisoresService } from './emisores.service.js';

function crearStellarMock(exists = true) {
  return {
    network: 'testnet',
    toDid: (address: string) => `did:stellar:testnet:${address}`,
    getAccount: vi.fn(async (address: string) => ({
      address,
      exists,
      balanceXlm: exists ? '100' : '0',
    })),
  } as unknown as StellarService & { getAccount: ReturnType<typeof vi.fn> };
}

describe('EmisoresService', () => {
  const stellarAddress = Keypair.random().publicKey();
  const dto = {
    nombre: 'Tecnológico de Costa Rica',
    categoria: 'universidad' as const,
    stellarAddress,
  };

  it('crea el emisor pendiente con su did:stellar', async () => {
    const service = new EmisoresService(
      new InMemoryEmisoresRepository(),
      crearStellarMock(),
    );

    const emisor = await service.create(dto);

    expect(emisor).toMatchObject({
      nombre: dto.nombre,
      categoria: 'universidad',
      sitioWeb: null,
      estado: 'pendiente',
      did: `did:stellar:testnet:${stellarAddress}`,
    });
    await expect(service.findAll()).resolves.toHaveLength(1);
  });

  it('rechaza una cuenta Stellar ya registrada', async () => {
    const service = new EmisoresService(
      new InMemoryEmisoresRepository(),
      crearStellarMock(),
    );
    await service.create(dto);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('exige que la cuenta exista on-chain', async () => {
    const service = new EmisoresService(
      new InMemoryEmisoresRepository(),
      crearStellarMock(false),
    );

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('actualiza solo los campos enviados', async () => {
    const service = new EmisoresService(
      new InMemoryEmisoresRepository(),
      crearStellarMock(),
    );
    const emisor = await service.create(dto);

    const actualizado = await service.update(emisor.id, {
      sitioWeb: 'https://www.tec.ac.cr',
    });

    expect(actualizado).toMatchObject({
      nombre: dto.nombre,
      sitioWeb: 'https://www.tec.ac.cr',
      estado: 'pendiente',
    });
  });

  it('responde 404 para un emisor inexistente', async () => {
    const service = new EmisoresService(
      new InMemoryEmisoresRepository(),
      crearStellarMock(),
    );

    await expect(service.findOne(crypto.randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
