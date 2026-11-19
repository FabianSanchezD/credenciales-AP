import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { StellarService } from '../stellar/stellar.service.js';
import type { Emisor, EstadoEmisor } from './emisor.entity.js';
import type {
  ActualizarEmisorDto,
  CambiarEstadoDto,
  CrearEmisorDto,
} from './emisores.schemas.js';
import { EmisoresRepository } from './emisores.repository.js';

@Injectable()
export class EmisoresService {
  constructor(
    private readonly repository: EmisoresRepository,
    private readonly stellar: StellarService,
  ) {}

  findAll(estado?: EstadoEmisor): Promise<Emisor[]> {
    return this.repository.findAll(estado);
  }

  async findOne(id: string): Promise<Emisor> {
    const emisor = await this.repository.findById(id);
    if (!emisor) {
      throw new NotFoundException(`No existe el emisor ${id}`);
    }
    return emisor;
  }

  findByAddress(address: string): Promise<Emisor | null> {
    return this.repository.findByStellarAddress(address);
  }

  /** Emisor registrado con la cuenta de la sesión. */
  async delaCuenta(address: string): Promise<Emisor> {
    const emisor = await this.repository.findByStellarAddress(address);
    if (!emisor) {
      throw new ForbiddenException(
        'Primero registra tu institución como emisor',
      );
    }
    return emisor;
  }

  /** El emisor `id` existe y pertenece a la cuenta de la sesión. */
  async propio(id: string, address: string): Promise<Emisor> {
    const emisor = await this.findOne(id);
    if (emisor.stellarAddress !== address) {
      throw new ForbiddenException(
        'Solo la institución dueña de este emisor puede hacer esta acción',
      );
    }
    return emisor;
  }

  /** Registra la cuenta de la sesión como emisor `pendiente`. */
  async create(address: string, dto: CrearEmisorDto): Promise<Emisor> {
    if (await this.repository.findByStellarAddress(address)) {
      throw new ConflictException(
        'Ya existe un emisor registrado con esa cuenta Stellar',
      );
    }

    // El emisor firma y paga la emisión, así que su cuenta debe existir on-chain.
    const cuenta = await this.stellar.getAccount(address);
    if (!cuenta.exists) {
      throw new UnprocessableEntityException(
        `La cuenta ${address} no existe en ${this.stellar.network}`,
      );
    }

    const ahora = new Date().toISOString();
    return this.repository.save({
      id: randomUUID(),
      nombre: dto.nombre,
      categoria: dto.categoria,
      sitioWeb: dto.sitioWeb ?? null,
      stellarAddress: address,
      did: this.stellar.toDid(address),
      estado: 'pendiente',
      motivoEstado: null,
      autorizadoEn: null,
      suspendidoEn: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  async update(
    id: string,
    address: string,
    dto: ActualizarEmisorDto,
  ): Promise<Emisor> {
    const emisor = await this.propio(id, address);
    return this.repository.save({
      ...emisor,
      ...(dto.nombre !== undefined && { nombre: dto.nombre }),
      ...(dto.sitioWeb !== undefined && { sitioWeb: dto.sitioWeb }),
      actualizadoEn: new Date().toISOString(),
    });
  }

  /**
   * La institución corrigió su solicitud: actualiza los datos públicos y la
   * devuelve a `pendiente` para una nueva revisión.
   */
  async reenviar(
    address: string,
    datos: Pick<Emisor, 'nombre' | 'categoria' | 'sitioWeb'>,
  ): Promise<Emisor> {
    const emisor = await this.delaCuenta(address);
    if (emisor.estado !== 'correcciones') {
      throw new ConflictException(
        'Solo se puede reenviar una solicitud que tiene correcciones pendientes',
      );
    }
    return this.repository.save({
      ...emisor,
      ...datos,
      estado: 'pendiente',
      actualizadoEn: new Date().toISOString(),
    });
  }

  /** Decisión de la entidad que autoriza (registro de confianza). */
  async cambiarEstado(id: string, dto: CambiarEstadoDto): Promise<Emisor> {
    const emisor = await this.findOne(id);
    if (emisor.estado === dto.estado) {
      throw new ConflictException(`El emisor ya está ${dto.estado}`);
    }
    const ahora = new Date().toISOString();
    return this.repository.save({
      ...emisor,
      estado: dto.estado,
      motivoEstado: dto.motivo,
      ...(dto.estado === 'autorizado' && { autorizadoEn: ahora }),
      ...(dto.estado === 'suspendido' && { suspendidoEn: ahora }),
      actualizadoEn: ahora,
    });
  }
}
