import { Injectable } from '@nestjs/common';
import { BaseDatosService } from '../database/base-datos.service.js';

export interface EntradaBoveda {
  vcId: string;
  titularAddress: string;
  emisorId: string;
  contenidoCifrado: string;
  emitidaEn: string;
  revocadaEn: string | null;
  motivoRevocacion: string | null;
}

export abstract class BovedaRepository {
  abstract listar(titularAddress: string): Promise<EntradaBoveda[]>;
  abstract guardar(entrada: EntradaBoveda): Promise<void>;
  abstract marcarRevocada(
    vcId: string,
    fecha: string,
    motivo: string,
  ): Promise<void>;
  abstract listarBloqueos(titularAddress: string): Promise<string[]>;
  abstract bloquear(titularAddress: string, emisorId: string): Promise<void>;
  abstract desbloquear(titularAddress: string, emisorId: string): Promise<void>;
  abstract estaBloqueado(
    titularAddress: string,
    emisorId: string,
  ): Promise<boolean>;
}

interface FilaBoveda {
  vc_id: string;
  titular_address: string;
  emisor_id: string;
  contenido_cifrado: string;
  emitida_en: string;
  revocada_en: string | null;
  motivo_revocacion: string | null;
}

@Injectable()
export class SqliteBovedaRepository extends BovedaRepository {
  constructor(private readonly bd: BaseDatosService) {
    super();
  }

  async listar(titularAddress: string): Promise<EntradaBoveda[]> {
    const filas = this.bd.db
      .prepare(
        'SELECT * FROM boveda WHERE titular_address = ? ORDER BY emitida_en DESC',
      )
      .all(titularAddress) as unknown as FilaBoveda[];
    return filas.map((fila) => ({
      vcId: fila.vc_id,
      titularAddress: fila.titular_address,
      emisorId: fila.emisor_id,
      contenidoCifrado: fila.contenido_cifrado,
      emitidaEn: fila.emitida_en,
      revocadaEn: fila.revocada_en,
      motivoRevocacion: fila.motivo_revocacion,
    }));
  }

  async guardar(entrada: EntradaBoveda): Promise<void> {
    this.bd.db
      .prepare(
        `INSERT OR REPLACE INTO boveda (vc_id, titular_address, emisor_id, contenido_cifrado,
           emitida_en, revocada_en, motivo_revocacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entrada.vcId,
        entrada.titularAddress,
        entrada.emisorId,
        entrada.contenidoCifrado,
        entrada.emitidaEn,
        entrada.revocadaEn,
        entrada.motivoRevocacion,
      );
  }

  async marcarRevocada(
    vcId: string,
    fecha: string,
    motivo: string,
  ): Promise<void> {
    this.bd.db
      .prepare(
        'UPDATE boveda SET revocada_en = ?, motivo_revocacion = ? WHERE vc_id = ?',
      )
      .run(fecha, motivo, vcId);
  }

  async listarBloqueos(titularAddress: string): Promise<string[]> {
    const filas = this.bd.db
      .prepare(
        'SELECT emisor_id FROM bloqueos WHERE titular_address = ? ORDER BY creado_en',
      )
      .all(titularAddress) as unknown as { emisor_id: string }[];
    return filas.map((fila) => fila.emisor_id);
  }

  async bloquear(titularAddress: string, emisorId: string): Promise<void> {
    this.bd.db
      .prepare(
        `INSERT OR IGNORE INTO bloqueos (titular_address, emisor_id, creado_en)
         VALUES (?, ?, ?)`,
      )
      .run(titularAddress, emisorId, new Date().toISOString());
  }

  async desbloquear(titularAddress: string, emisorId: string): Promise<void> {
    this.bd.db
      .prepare(
        'DELETE FROM bloqueos WHERE titular_address = ? AND emisor_id = ?',
      )
      .run(titularAddress, emisorId);
  }

  async estaBloqueado(
    titularAddress: string,
    emisorId: string,
  ): Promise<boolean> {
    return (
      this.bd.db
        .prepare(
          'SELECT 1 FROM bloqueos WHERE titular_address = ? AND emisor_id = ?',
        )
        .get(titularAddress, emisorId) !== undefined
    );
  }
}
