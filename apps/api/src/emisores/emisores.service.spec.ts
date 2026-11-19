import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Keypair } from '@stellar/stellar-sdk';
import { stellarPrueba } from '../../test/soporte.js';
import { BaseDatosService } from '../database/base-datos.service.js';
import { SqliteEmisoresRepository } from './emisores.repository.js';
import { EmisoresService } from './emisores.service.js';

function crearServicio(existe = true) {
  return new EmisoresService(
    new SqliteEmisoresRepository(new BaseDatosService(':memory:')),
    stellarPrueba({ existe }),
  );
}

describe('EmisoresService', () => {
  const stellarAddress = Keypair.random().publicKey();
  const dto = {
    nombre: 'Tecnológico de Costa Rica',
    categoria: 'universidad' as const,
  };

  it('registra la cuenta de la sesión como emisor pendiente', async () => {
    const service = crearServicio();

    const emisor = await service.create(stellarAddress, dto);

    expect(emisor).toMatchObject({
      nombre: dto.nombre,
      categoria: 'universidad',
      sitioWeb: null,
      estado: 'pendiente',
      stellarAddress,
      did: `did:stellar:testnet:${stellarAddress}`,
      motivoEstado: null,
      autorizadoEn: null,
      suspendidoEn: null,
    });
    await expect(service.findAll()).resolves.toHaveLength(1);
    await expect(service.findAll('autorizado')).resolves.toHaveLength(0);
  });

  it('rechaza una cuenta Stellar ya registrada', async () => {
    const service = crearServicio();
    await service.create(stellarAddress, dto);

    await expect(service.create(stellarAddress, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('exige que la cuenta exista on-chain', async () => {
    await expect(
      crearServicio(false).create(stellarAddress, dto),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('solo el dueño actualiza nombre y sitio web', async () => {
    const service = crearServicio();
    const emisor = await service.create(stellarAddress, dto);

    const actualizado = await service.update(emisor.id, stellarAddress, {
      sitioWeb: 'https://www.tec.ac.cr',
    });
    expect(actualizado).toMatchObject({
      nombre: dto.nombre,
      sitioWeb: 'https://www.tec.ac.cr',
      estado: 'pendiente',
    });

    await expect(
      service.update(emisor.id, Keypair.random().publicKey(), {
        nombre: 'Otro',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('registra fechas y motivo al autorizar y suspender', async () => {
    const service = crearServicio();
    const emisor = await service.create(stellarAddress, dto);

    const autorizado = await service.cambiarEstado(emisor.id, {
      estado: 'autorizado',
      motivo: 'Documentación completa',
    });
    expect(autorizado.estado).toBe('autorizado');
    expect(autorizado.autorizadoEn).not.toBeNull();
    expect(autorizado.motivoEstado).toBe('Documentación completa');

    const suspendido = await service.cambiarEstado(emisor.id, {
      estado: 'suspendido',
      motivo: 'Denuncia en revisión',
    });
    expect(suspendido.suspendidoEn).not.toBeNull();
    expect(suspendido.autorizadoEn).toBe(autorizado.autorizadoEn);

    await expect(
      service.cambiarEstado(emisor.id, {
        estado: 'suspendido',
        motivo: 'Otra vez',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('responde 404 para un emisor inexistente', async () => {
    await expect(
      crearServicio().findOne(crypto.randomUUID()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
