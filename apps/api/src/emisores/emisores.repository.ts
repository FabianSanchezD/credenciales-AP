import { Injectable } from '@nestjs/common';
import type { Emisor } from './emisor.entity.js';

export abstract class EmisoresRepository {
  abstract findAll(): Promise<Emisor[]>;
  abstract findById(id: string): Promise<Emisor | null>;
  abstract findByStellarAddress(address: string): Promise<Emisor | null>;
  abstract save(emisor: Emisor): Promise<Emisor>;
}

/** Implementación en memoria hasta definir la base de datos. */
@Injectable()
export class InMemoryEmisoresRepository extends EmisoresRepository {
  private readonly emisores = new Map<string, Emisor>();

  async findAll(): Promise<Emisor[]> {
    return [...this.emisores.values()];
  }

  async findById(id: string): Promise<Emisor | null> {
    return this.emisores.get(id) ?? null;
  }

  async findByStellarAddress(address: string): Promise<Emisor | null> {
    for (const emisor of this.emisores.values()) {
      if (emisor.stellarAddress === address) return emisor;
    }
    return null;
  }

  async save(emisor: Emisor): Promise<Emisor> {
    this.emisores.set(emisor.id, emisor);
    return emisor;
  }
}
