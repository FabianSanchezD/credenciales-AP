import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { ESQUEMA_SQL } from './esquema.js';

/** Conexión SQLite compartida (ADR 0003). */
@Injectable()
export class BaseDatosService implements OnApplicationShutdown {
  readonly db: DatabaseSync;

  constructor(ruta: string) {
    if (ruta !== ':memory:') {
      mkdirSync(dirname(ruta), { recursive: true });
    }
    this.db = new DatabaseSync(ruta);
    this.db.exec('PRAGMA foreign_keys = ON;');
    if (ruta !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec(ESQUEMA_SQL);
  }

  /** Ejecuta `fn` dentro de una transacción. */
  transaccion<T>(fn: () => T): T {
    this.db.exec('BEGIN');
    try {
      const resultado = fn();
      this.db.exec('COMMIT');
      return resultado;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  onApplicationShutdown(): void {
    if (this.db.isOpen) this.db.close();
  }
}
