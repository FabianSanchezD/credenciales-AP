import type { TransaccionPorFirmar } from '@repo/cliente';
import type { CredencialFirmada, EstadoCredencial } from '@repo/credenciales';

export interface DatosEmisionAnclaje {
  vcId: string;
  /** SHA-256 (hex) de la credencial firmada. */
  hashHex: string;
  credencial: CredencialFirmada;
  emisorAddress: string;
  titularAddress: string;
}

export interface DatosEstadoCredencial {
  vcId: string;
  emisorAddress: string;
  titularAddress: string;
}

export interface DatosRevocacionAnclaje {
  vcId: string;
  emisorAddress: string;
  titularAddress: string;
  fecha: Date;
}

export interface EstadoAnclaje {
  anclado: boolean;
  hashHex: string | null;
  revocadaEn: string | null;
}

export type OperacionAnclaje = 'emision' | 'revocacion';

/**
 * Puerto de anclaje (ADR 0001): el "adaptador ACTA" de la sección 4.2. El
 * resto del sistema solo conoce esta interfaz.
 */
export abstract class AnclajeDriver {
  /** Tipo que se publica en `/config`. */
  abstract readonly tipo: 'stellar' | 'acta';

  /** `credentialStatus` de una credencial nueva: dónde se consulta su estado. */
  abstract estadoCredencial(datos: DatosEstadoCredencial): EstadoCredencial;

  abstract prepararEmision(
    datos: DatosEmisionAnclaje,
  ): Promise<TransaccionPorFirmar>;

  abstract prepararRevocacion(
    datos: DatosRevocacionAnclaje,
  ): Promise<TransaccionPorFirmar>;

  /** Envía la transacción que firmó el emisor. */
  abstract enviar(
    signedXdr: string,
    operacion: OperacionAnclaje,
  ): Promise<{ txHash: string }>;

  abstract consultar(datos: {
    estado: EstadoCredencial;
  }): Promise<EstadoAnclaje>;
}
