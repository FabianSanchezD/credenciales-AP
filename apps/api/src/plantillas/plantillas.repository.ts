import { Injectable } from '@nestjs/common';
import type { ContenidoPlantilla } from '@repo/credenciales';
import { BaseDatosService } from '../database/base-datos.service.js';
import type { Plantilla } from './plantilla.entity.js';

export abstract class PlantillasRepository {
  abstract findByEmisor(emisorId: string): Promise<Plantilla[]>;
  abstract findById(emisorId: string, id: string): Promise<Plantilla | null>;
  /** `modificadaPor`: cuenta que hizo el cambio, para el indicador de autonomía. */
  abstract save(
    plantilla: Plantilla,
    modificadaPor: string,
  ): Promise<Plantilla>;
  abstract organizar(
    id: string,
    carpeta: string | null,
    etiquetas: string[],
  ): Promise<void>;
  /** Carpetas guardadas del emisor (incluye las vacías). */
  abstract carpetas(emisorId: string): Promise<string[]>;
  abstract guardarCarpeta(emisorId: string, ruta: string): Promise<void>;
  /** Cambia el prefijo `de` por `a` en carpetas y plantillas. */
  abstract renombrarCarpeta(
    emisorId: string,
    de: string,
    a: string,
  ): Promise<void>;
  abstract eliminarCarpeta(emisorId: string, ruta: string): Promise<void>;
}

interface FilaPlantilla {
  id: string;
  emisor_id: string;
  contenido: string;
  version: number;
  archivada: number;
  creada_en: string;
  actualizada_en: string;
  carpeta: string | null;
  etiquetas: string | null;
}

const SELECT = `SELECT p.*, o.carpeta, o.etiquetas FROM plantillas p
  LEFT JOIN organizacion_plantillas o ON o.plantilla_id = p.id`;

/** `ruta` es la carpeta o una subcarpeta suya. */
const dentroDe = (ruta: string, carpeta: string) =>
  ruta === carpeta || ruta.startsWith(`${carpeta}/`);

function aPlantilla(fila: FilaPlantilla): Plantilla {
  const contenido = JSON.parse(fila.contenido) as ContenidoPlantilla;
  return {
    id: fila.id,
    emisorId: fila.emisor_id,
    ...contenido,
    version: fila.version,
    archivada: fila.archivada === 1,
    creadaEn: fila.creada_en,
    actualizadaEn: fila.actualizada_en,
    carpeta: fila.carpeta ?? null,
    etiquetas: fila.etiquetas ? (JSON.parse(fila.etiquetas) as string[]) : [],
  };
}

export function contenidoDe(plantilla: Plantilla): ContenidoPlantilla {
  return {
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    resultadosAprendizaje: plantilla.resultadosAprendizaje,
    temasEvaluados: plantilla.temasEvaluados,
    contexto: plantilla.contexto,
    vigenciaMeses: plantilla.vigenciaMeses,
  };
}

@Injectable()
export class SqlitePlantillasRepository extends PlantillasRepository {
  constructor(private readonly bd: BaseDatosService) {
    super();
  }

  async findByEmisor(emisorId: string): Promise<Plantilla[]> {
    const filas = this.bd.db
      .prepare(`${SELECT} WHERE p.emisor_id = ? ORDER BY p.creada_en`)
      .all(emisorId) as unknown as FilaPlantilla[];
    return filas.map(aPlantilla);
  }

  async findById(emisorId: string, id: string): Promise<Plantilla | null> {
    const fila = this.bd.db
      .prepare(`${SELECT} WHERE p.emisor_id = ? AND p.id = ?`)
      .get(emisorId, id) as FilaPlantilla | undefined;
    return fila ? aPlantilla(fila) : null;
  }

  async save(plantilla: Plantilla, modificadaPor: string): Promise<Plantilla> {
    this.bd.db
      .prepare(
        `INSERT INTO plantillas (id, emisor_id, contenido, version, archivada, modificada_por,
           creada_en, actualizada_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           contenido = excluded.contenido,
           version = excluded.version,
           archivada = excluded.archivada,
           modificada_por = excluded.modificada_por,
           actualizada_en = excluded.actualizada_en`,
      )
      .run(
        plantilla.id,
        plantilla.emisorId,
        JSON.stringify(contenidoDe(plantilla)),
        plantilla.version,
        plantilla.archivada ? 1 : 0,
        modificadaPor,
        plantilla.creadaEn,
        plantilla.actualizadaEn,
      );
    return plantilla;
  }

  async organizar(
    id: string,
    carpeta: string | null,
    etiquetas: string[],
  ): Promise<void> {
    this.bd.db
      .prepare(
        `INSERT INTO organizacion_plantillas (plantilla_id, carpeta, etiquetas)
         VALUES (?, ?, ?)
         ON CONFLICT (plantilla_id) DO UPDATE SET
           carpeta = excluded.carpeta, etiquetas = excluded.etiquetas`,
      )
      .run(id, carpeta, JSON.stringify(etiquetas));
  }

  async carpetas(emisorId: string): Promise<string[]> {
    const filas = this.bd.db
      .prepare('SELECT ruta FROM carpetas_plantillas WHERE emisor_id = ?')
      .all(emisorId) as Array<{ ruta: string }>;
    return filas.map((f) => f.ruta);
  }

  async guardarCarpeta(emisorId: string, ruta: string): Promise<void> {
    this.bd.db
      .prepare(
        'INSERT OR IGNORE INTO carpetas_plantillas (emisor_id, ruta) VALUES (?, ?)',
      )
      .run(emisorId, ruta);
  }

  async renombrarCarpeta(
    emisorId: string,
    de: string,
    a: string,
  ): Promise<void> {
    const cambiar = (ruta: string) => a + ruta.slice(de.length);
    this.bd.transaccion(() => {
      const guardadas = (
        this.bd.db
          .prepare('SELECT ruta FROM carpetas_plantillas WHERE emisor_id = ?')
          .all(emisorId) as Array<{ ruta: string }>
      ).map((f) => f.ruta);
      for (const ruta of guardadas.filter((r) => dentroDe(r, de))) {
        this.bd.db
          .prepare(
            'DELETE FROM carpetas_plantillas WHERE emisor_id = ? AND ruta = ?',
          )
          .run(emisorId, ruta);
        this.bd.db
          .prepare(
            'INSERT OR IGNORE INTO carpetas_plantillas (emisor_id, ruta) VALUES (?, ?)',
          )
          .run(emisorId, cambiar(ruta));
      }
      const usadas = this.bd.db
        .prepare(
          `SELECT o.plantilla_id, o.carpeta FROM organizacion_plantillas o
           JOIN plantillas p ON p.id = o.plantilla_id
           WHERE p.emisor_id = ? AND o.carpeta IS NOT NULL`,
        )
        .all(emisorId) as Array<{ plantilla_id: string; carpeta: string }>;
      for (const u of usadas.filter((u) => dentroDe(u.carpeta, de))) {
        this.bd.db
          .prepare(
            'UPDATE organizacion_plantillas SET carpeta = ? WHERE plantilla_id = ?',
          )
          .run(cambiar(u.carpeta), u.plantilla_id);
      }
    });
  }

  async eliminarCarpeta(emisorId: string, ruta: string): Promise<void> {
    this.bd.db
      .prepare(
        'DELETE FROM carpetas_plantillas WHERE emisor_id = ? AND ruta = ?',
      )
      .run(emisorId, ruta);
  }
}
