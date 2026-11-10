import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EmisoresService } from '../emisores/emisores.service.js';
import { StellarService } from '../stellar/stellar.service.js';
import type { Titular } from './titular.entity.js';
import type { RegistrarTitularDto } from './titulares.schemas.js';
import { TitularesRepository } from './titulares.repository.js';

@Injectable()
export class TitularesService {
  constructor(
    private readonly repository: TitularesRepository,
    private readonly emisores: EmisoresService,
    private readonly stellar: StellarService,
  ) {}

  async findByEmisor(emisorId: string): Promise<Titular[]> {
    await this.emisores.findOne(emisorId);
    return this.repository.findByEmisor(emisorId);
  }

  /**
   * Inscribe el DID que el titular compartió con el emisor. La cuenta puede no
   * existir on-chain todavía: Cavos la crea de forma diferida.
   */
  async register(emisorId: string, dto: RegistrarTitularDto): Promise<Titular> {
    await this.emisores.findOne(emisorId);

    const parsed = this.stellar.parseDid(dto.did);
    if (!parsed) {
      throw new BadRequestException(
        `El DID debe pertenecer a la red ${this.stellar.network}`,
      );
    }
    if (await this.repository.findByDid(emisorId, parsed.did)) {
      throw new ConflictException('El titular ya está inscrito con este emisor');
    }

    return this.repository.save({
      id: randomUUID(),
      emisorId,
      did: parsed.did,
      stellarAddress: parsed.address,
      registradoEn: new Date().toISOString(),
    });
  }

  async remove(emisorId: string, titularId: string): Promise<void> {
    await this.emisores.findOne(emisorId);
    if (!(await this.repository.delete(emisorId, titularId))) {
      throw new NotFoundException(`No existe el titular ${titularId}`);
    }
  }
}
