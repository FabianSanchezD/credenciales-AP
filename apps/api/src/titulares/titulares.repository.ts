import { Injectable } from '@nestjs/common';
import type { Titular } from './titular.entity.js';

export abstract class TitularesRepository {
  abstract findByEmisor(emisorId: string): Promise<Titular[]>;
  abstract findById(emisorId: string, id: string): Promise<Titular | null>;
  abstract findByDid(emisorId: string, did: string): Promise<Titular | null>;
  abstract save(titular: Titular): Promise<Titular>;
  abstract delete(emisorId: string, id: string): Promise<boolean>;
}

/** Implementación en memoria hasta definir la base de datos. */
@Injectable()
export class InMemoryTitularesRepository extends TitularesRepository {
  private readonly titulares = new Map<string, Titular>();

  async findByEmisor(emisorId: string): Promise<Titular[]> {
    return [...this.titulares.values()].filter((t) => t.emisorId === emisorId);
  }

  async findById(emisorId: string, id: string): Promise<Titular | null> {
    const titular = this.titulares.get(id);
    return titular?.emisorId === emisorId ? titular : null;
  }

  async findByDid(emisorId: string, did: string): Promise<Titular | null> {
    for (const titular of this.titulares.values()) {
      if (titular.emisorId === emisorId && titular.did === did) return titular;
    }
    return null;
  }

  async save(titular: Titular): Promise<Titular> {
    this.titulares.set(titular.id, titular);
    return titular;
  }

  async delete(emisorId: string, id: string): Promise<boolean> {
    if (!(await this.findById(emisorId, id))) return false;
    return this.titulares.delete(id);
  }
}
