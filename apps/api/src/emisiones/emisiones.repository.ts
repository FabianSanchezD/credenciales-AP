import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type { RegistroEmision, RevocacionPendiente } from './emision.entity.js';

export abstract class EmisionesRepository {
  abstract findByEmisor(emisorId: string): Promise<RegistroEmision[]>;
  abstract findById(
    emisorId: string,
    id: string,
  ): Promise<RegistroEmision | null>;
  abstract save(registro: RegistroEmision): Promise<RegistroEmision>;
}

interface FilaEmision {
  id: string;
  emisor_id: string;
  plantilla_id: string;
  plantilla_nombre: string;
  titular_did: string;
  titular_address: string;
  estado: string;
  con_contexto: number;
  contenido_cifrado: string;
  hash: string | null;
  tx_preparada: string | null;
  tx_hash: string | null;
  emitida_en: string | null;
  revocacion_pendiente: string | null;
  revocada_en: string | null;
  motivo_revocacion: string | null;
  tx_revocacion: string | null;
  creada_en: string;
}

function aRegistro(fila: FilaEmision): RegistroEmision {
  return {
    id: fila.id,
    emisorId: fila.emisor_id,
    plantillaId: fila.plantilla_id,
    plantillaNombre: fila.plantilla_nombre,
    titularDid: fila.titular_did,
    titularAddress: fila.titular_address,
    estado: fila.estado as RegistroEmision['estado'],
    conContexto: fila.con_contexto === 1,
    contenidoCifrado: fila.contenido_cifrado,
    hash: fila.hash,
    txPreparada: fila.tx_preparada,
    txHash: fila.tx_hash,
    emitidaEn: fila.emitida_en,
    revocacionPendiente: fila.revocacion_pendiente
      ? (JSON.parse(fila.revocacion_pendiente) as RevocacionPendiente)
      : null,
    revocadaEn: fila.revocada_en,
    motivoRevocacion: fila.motivo_revocacion,
    txRevocacion: fila.tx_revocacion,
    creadaEn: fila.creada_en,
  };
}

@Injectable()
export class SqliteEmisionesRepository extends EmisionesRepository {
  constructor(private readonly bd: BaseDatosService) {
    super();
  }

  async findByEmisor(emisorId: string): Promise<RegistroEmision[]> {
    const filas = this.bd.db
      .prepare(
        'SELECT * FROM emisiones WHERE emisor_id = ? ORDER BY creada_en DESC',
      )
      .all(emisorId) as unknown as FilaEmision[];
    return filas.map(aRegistro);
  }

  async findById(
    emisorId: string,
    id: string,
  ): Promise<RegistroEmision | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM emisiones WHERE emisor_id = ? AND id = ?')
      .get(emisorId, id) as FilaEmision | undefined;
    return fila ? aRegistro(fila) : null;
  }

  async save(r: RegistroEmision): Promise<RegistroEmision> {
    this.bd.db
      .prepare(
        `INSERT INTO emisiones (id, emisor_id, plantilla_id, plantilla_nombre, titular_did,
           titular_address, estado, con_contexto, contenido_cifrado, hash, tx_preparada, tx_hash,
           emitida_en, revocacion_pendiente, revocada_en, motivo_revocacion, tx_revocacion,
           creada_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           estado = excluded.estado,
           contenido_cifrado = excluded.contenido_cifrado,
           hash = excluded.hash,
           tx_preparada = excluded.tx_preparada,
           tx_hash = excluded.tx_hash,
           emitida_en = excluded.emitida_en,
           revocacion_pendiente = excluded.revocacion_pendiente,
           revocada_en = excluded.revocada_en,
           motivo_revocacion = excluded.motivo_revocacion,
           tx_revocacion = excluded.tx_revocacion`,
      )
      .run(
        r.id,
        r.emisorId,
        r.plantillaId,
        r.plantillaNombre,
        r.titularDid,
        r.titularAddress,
        r.estado,
        r.conContexto ? 1 : 0,
        r.contenidoCifrado,
        r.hash,
        r.txPreparada,
        r.txHash,
        r.emitidaEn,
        r.revocacionPendiente ? JSON.stringify(r.revocacionPendiente) : null,
        r.revocadaEn,
        r.motivoRevocacion,
        r.txRevocacion,
        r.creadaEn,
      );
    return r;
  }
}
