import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type { Titular } from './titular.entity.js';

export abstract class TitularesRepository {
  abstract findByEmisor(emisorId: string): Promise<Titular[]>;
  abstract findById(emisorId: string, id: string): Promise<Titular | null>;
  abstract findByDid(emisorId: string, did: string): Promise<Titular | null>;
  abstract save(titular: Titular): Promise<Titular>;
  abstract delete(emisorId: string, id: string): Promise<boolean>;
}

interface FilaTitular {
  id: string;
  emisor_id: string;
  did: string;
  stellar_address: string;
  registrado_en: string;
}

function aTitular(fila: FilaTitular): Titular {
  return {
    id: fila.id,
    emisorId: fila.emisor_id,
    did: fila.did,
    stellarAddress: fila.stellar_address,
    registradoEn: fila.registrado_en,
  };
}

@Injectable()
export class SqliteTitularesRepository extends TitularesRepository {
  constructor(private readonly bd: BaseDatosService) {
    super();
  }

  async findByEmisor(emisorId: string): Promise<Titular[]> {
    const filas = this.bd.db
      .prepare(
        'SELECT * FROM titulares WHERE emisor_id = ? ORDER BY registrado_en',
      )
      .all(emisorId) as unknown as FilaTitular[];
    return filas.map(aTitular);
  }

  async findById(emisorId: string, id: string): Promise<Titular | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM titulares WHERE emisor_id = ? AND id = ?')
      .get(emisorId, id) as FilaTitular | undefined;
    return fila ? aTitular(fila) : null;
  }

  async findByDid(emisorId: string, did: string): Promise<Titular | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM titulares WHERE emisor_id = ? AND did = ?')
      .get(emisorId, did) as FilaTitular | undefined;
    return fila ? aTitular(fila) : null;
  }

  async save(titular: Titular): Promise<Titular> {
    this.bd.db
      .prepare(
        `INSERT OR REPLACE INTO titulares (id, emisor_id, did, stellar_address, registrado_en)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        titular.id,
        titular.emisorId,
        titular.did,
        titular.stellarAddress,
        titular.registradoEn,
      );
    return titular;
  }

  async delete(emisorId: string, id: string): Promise<boolean> {
    const resultado = this.bd.db
      .prepare('DELETE FROM titulares WHERE emisor_id = ? AND id = ?')
      .run(emisorId, id);
    return Number(resultado.changes) > 0;
  }
}
