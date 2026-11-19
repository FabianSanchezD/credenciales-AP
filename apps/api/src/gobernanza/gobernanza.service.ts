import { Injectable } from '@nestjs/common';
import type { Indicador, ResumenGobernanza } from '@repo/cliente';
import { BaseDatosService } from '../database/base-datos.service.js';
import {
  ESTADOS_EMISOR,
  type EstadoEmisor,
} from '../emisores/emisor.entity.js';

/** Resumen e indicadores de las salvaguardas (Tabla 1 del entregable). */
@Injectable()
export class GobernanzaService {
  constructor(private readonly bd: BaseDatosService) {}

  resumen(): ResumenGobernanza {
    const emisores = Object.fromEntries(
      ESTADOS_EMISOR.map((estado) => [estado, 0]),
    ) as Record<EstadoEmisor, number>;
    for (const fila of this.filas<{ estado: EstadoEmisor; total: number }>(
      'SELECT estado, COUNT(*) AS total FROM emisores GROUP BY estado',
    )) {
      emisores[fila.estado] = Number(fila.total);
    }

    const emitidas = this.numero(
      "SELECT COUNT(*) AS n FROM emisiones WHERE estado IN ('emitida', 'revocada')",
    );
    const revocadas = this.numero(
      "SELECT COUNT(*) AS n FROM emisiones WHERE estado = 'revocada'",
    );
    const titulares = this.numero(
      `SELECT COUNT(*) AS n FROM (
         SELECT stellar_address FROM titulares
         UNION SELECT titular_address FROM emisiones WHERE estado IN ('emitida', 'revocada')
       )`,
    );
    const plantillas = this.numero(
      'SELECT COUNT(*) AS n FROM plantillas WHERE archivada = 0',
    );

    return {
      emisores,
      credenciales: { emitidas, revocadas },
      titulares,
      plantillas,
      indicadores: this.indicadores(emitidas),
    };
  }

  private indicadores(emitidas: number): Indicador[] {
    const conContexto = this.numero(
      "SELECT COUNT(*) AS n FROM emisiones WHERE estado IN ('emitida', 'revocada') AND con_contexto = 1",
    );
    const porcentaje =
      emitidas === 0 ? 100 : Math.floor((conContexto / emitidas) * 100);

    // Una credencial guardada en una bóveda distinta a la de su titular.
    const transferidas = this.numero(
      `SELECT COUNT(*) AS n FROM boveda b JOIN emisiones e ON e.id = b.vc_id
       WHERE b.titular_address <> e.titular_address`,
    );

    // Versiones de plantilla escritas por una cuenta que no es la del emisor.
    const cambiosPlataforma = this.numero(
      `SELECT COUNT(*) AS n FROM plantillas p JOIN emisores e ON e.id = p.emisor_id
       WHERE p.modificada_por <> e.stellar_address`,
    );

    // Toda transacción de anclaje la firma y la paga la cuenta del emisor (la
    // API lo exige al enviarla): titulares y verificadores no pagan nada.
    const costoTerceros = 0;

    // La API no tiene dónde guardar presentaciones: se comprueba en el esquema.
    const presentaciones = this.numero(
      "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name LIKE '%presentacion%'",
    );

    return [
      {
        id: 'contexto-completo',
        nombre: 'Credenciales con resultados de aprendizaje y contexto',
        salvaguarda: 'Calidad y transparencia (S1)',
        valor: `${porcentaje} %`,
        meta: '100 %',
        cumple: porcentaje === 100,
      },
      {
        id: 'transferidas-terceros',
        nombre: 'Credenciales transferidas a terceros',
        salvaguarda: 'Control del titular',
        valor: String(transferidas),
        meta: '0',
        cumple: transferidas === 0,
      },
      {
        id: 'cambios-plantilla-plataforma',
        nombre: 'Cambios de plantillas hechos por la plataforma',
        salvaguarda: 'Autonomía del emisor',
        valor: String(cambiosPlataforma),
        meta: '0',
        cumple: cambiosPlataforma === 0,
      },
      {
        id: 'costo-titulares-verificadores',
        nombre: 'Costo pagado por titulares y verificadores',
        salvaguarda: 'Acceso gratuito',
        valor: '$' + String(costoTerceros),
        meta: '$0',
        cumple: costoTerceros === 0,
      },
      {
        id: 'presentaciones-almacenadas',
        nombre: 'Presentaciones almacenadas por la plataforma',
        salvaguarda: 'Privacidad',
        valor: String(presentaciones),
        meta: '0',
        cumple: presentaciones === 0,
      },
    ];
  }

  private filas<T>(sql: string): T[] {
    return this.bd.db.prepare(sql).all() as unknown as T[];
  }

  private numero(sql: string): number {
    const fila = this.bd.db.prepare(sql).get() as { n: number } | undefined;
    return Number(fila?.n ?? 0);
  }
}
