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
}

interface FilaPlantilla {
  id: string;
  emisor_id: string;
  contenido: string;
  version: number;
  archivada: number;
  creada_en: string;
  actualizada_en: string;
}

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
      .prepare(
        'SELECT * FROM plantillas WHERE emisor_id = ? ORDER BY creada_en',
      )
      .all(emisorId) as unknown as FilaPlantilla[];
    return filas.map(aPlantilla);
  }

  async findById(emisorId: string, id: string): Promise<Plantilla | null> {
    const fila = this.bd.db
      .prepare('SELECT * FROM plantillas WHERE emisor_id = ? AND id = ?')
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
}
