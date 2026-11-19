import type { Emision as EmisionContrato } from '@repo/cliente';

export type Emision = EmisionContrato;
export type EstadoEmision = Emision['estado'];

export interface RevocacionPendiente {
  motivo: string;
  fecha: string;
  /** Hash (hex) de la transacción preparada. */
  txPreparada: string;
}

/** Registro interno: agrega lo que el contrato HTTP no expone. */
export interface RegistroEmision extends Emision {
  titularAddress: string;
  /** La credencial lleva resultados de aprendizaje y contexto (S1). */
  conContexto: boolean;
  /** Credencial (sin firmar o firmada) y divulgaciones, cifradas. */
  contenidoCifrado: string;
  /** Hash (hex) de la transacción de anclaje preparada. */
  txPreparada: string | null;
  revocacionPendiente: RevocacionPendiente | null;
}

export function aEmision(registro: RegistroEmision): Emision {
  return {
    id: registro.id,
    emisorId: registro.emisorId,
    plantillaId: registro.plantillaId,
    plantillaNombre: registro.plantillaNombre,
    titularDid: registro.titularDid,
    estado: registro.estado,
    hash: registro.hash,
    txHash: registro.txHash,
    emitidaEn: registro.emitidaEn,
    revocadaEn: registro.revocadaEn,
    motivoRevocacion: registro.motivoRevocacion,
    txRevocacion: registro.txRevocacion,
    creadaEn: registro.creadaEn,
  };
}
