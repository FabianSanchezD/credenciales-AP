import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';
import type { Emisor, EstadoEmisor } from './emisor.entity.js';

export abstract class EmisoresRepository {
  abstract findAll(estado?: EstadoEmisor): Promise<Emisor[]>;
  abstract findById(id: string): Promise<Emisor | null>;
  abstract findByStellarAddress(address: string): Promise<Emisor | null>;
  abstract save(emisor: Emisor): Promise<Emisor>;
}

interface FilaEmisor {
  id: string;
  nombre: string;
  categoria: string;
  sitio_web: string | null;
  stellar_address: string;
  did: string;
  estado: string;
  motivo_estado: string | null;
  autorizado_en: string | null;
  suspendido_en: string | null;
  creado_en: string;
  actualizado_en: string;
}

function aEmisor(fila: FilaEmisor): Emisor {
  return {
    id: fila.id,
    nombre: fila.nombre,
    categoria: fila.categoria as Emisor['categoria'],
    sitioWeb: fila.sitio_web,
    stellarAddress: fila.stellar_address,
    did: fila.did,
    estado: fila.estado as EstadoEmisor,
    motivoEstado: fila.motivo_estado,
    autorizadoEn: fila.autorizado_en,
    suspendidoEn: fila.suspendido_en,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
  };
}

@Injectable()
export class SqliteEmisoresRepository extends EmisoresRepository {
  constructor(private readonly bd: BaseDatosService) {
    super();
  }

  async findAll(estado?: EstadoEmisor): Promise<Emisor[]> {
    const filas = estado
      ? this.bd.db
          .prepare('SELECT * FROM emisores WHERE estado = ? ORDER BY creado_en')
          .all(estado)
      : this.bd.db.prepare('SELECT * FROM emisores ORDER BY creado_en').all();
    return (filas as unknown as FilaEmisor[]).map(aEmisor);
  }

  async findById(id: string): Promise<Emisor | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM emisores WHERE id = ?')
      .get(id) as FilaEmisor | undefined;
    return fila ? aEmisor(fila) : null;
  }

  async findByStellarAddress(address: string): Promise<Emisor | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM emisores WHERE stellar_address = ?')
      .get(address) as FilaEmisor | undefined;
    return fila ? aEmisor(fila) : null;
  }

  async save(emisor: Emisor): Promise<Emisor> {
    this.bd.db
      .prepare(
        `INSERT INTO emisores (id, nombre, categoria, sitio_web, stellar_address, did, estado,
           motivo_estado, autorizado_en, suspendido_en, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           nombre = excluded.nombre,
           categoria = excluded.categoria,
           sitio_web = excluded.sitio_web,
           estado = excluded.estado,
           motivo_estado = excluded.motivo_estado,
           autorizado_en = excluded.autorizado_en,
           suspendido_en = excluded.suspendido_en,
           actualizado_en = excluded.actualizado_en`,
      )
      .run(
        emisor.id,
        emisor.nombre,
        emisor.categoria,
        emisor.sitioWeb,
        emisor.stellarAddress,
        emisor.did,
        emisor.estado,
        emisor.motivoEstado,
        emisor.autorizadoEn,
        emisor.suspendidoEn,
        emisor.creadoEn,
        emisor.actualizadoEn,
      );
    return emisor;
  }
}
