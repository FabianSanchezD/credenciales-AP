import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StellarService } from '../stellar/stellar.service.js';
import type { Emisor } from './emisor.entity.js';
import type {
  ActualizarEmisorDto,
  CrearEmisorDto,
} from './emisores.schemas.js';
import { EmisoresRepository } from './emisores.repository.js';

@Injectable()
export class EmisoresService {
  constructor(
    private readonly repository: EmisoresRepository,
    private readonly stellar: StellarService,
  ) {}

  findAll(): Promise<Emisor[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Emisor> {
    const emisor = await this.repository.findById(id);
    if (!emisor) {
      throw new NotFoundException(`No existe el emisor ${id}`);
    }
    return emisor;
  }

  async create(dto: CrearEmisorDto): Promise<Emisor> {
    if (await this.repository.findByStellarAddress(dto.stellarAddress)) {
      throw new ConflictException(
        'Ya existe un emisor registrado con esa cuenta Stellar',
      );
    }

    // El emisor firma y paga la emisión, así que su cuenta debe existir on-chain.
    const cuenta = await this.stellar.getAccount(dto.stellarAddress);
    if (!cuenta.exists) {
      throw new UnprocessableEntityException(
        `La cuenta ${dto.stellarAddress} no existe en ${this.stellar.network}`,
      );
    }

    const ahora = new Date().toISOString();
    return this.repository.save({
      id: randomUUID(),
      nombre: dto.nombre,
      categoria: dto.categoria,
      sitioWeb: dto.sitioWeb ?? null,
      stellarAddress: dto.stellarAddress,
      did: this.stellar.toDid(dto.stellarAddress),
      estado: 'pendiente',
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  async update(id: string, dto: ActualizarEmisorDto): Promise<Emisor> {
    const emisor = await this.findOne(id);
    return this.repository.save({
      ...emisor,
      ...(dto.nombre !== undefined && { nombre: dto.nombre }),
      ...(dto.categoria !== undefined && { categoria: dto.categoria }),
      ...(dto.sitioWeb !== undefined && { sitioWeb: dto.sitioWeb }),
      actualizadoEn: new Date().toISOString(),
    });
  }
}
