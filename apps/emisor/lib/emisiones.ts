import type { EstadoEmision } from "@repo/cliente";
import type { EstadoSello, TonoEstado } from "@repo/ui";
import { env } from "./env";

export const ETIQUETAS_ESTADO_EMISION: Record<EstadoEmision, string> = {
  borrador: "Borrador",
  firmada: "Firmada, sin anclar",
  emitida: "Emitida",
  revocada: "Revocada",
};

export const TONOS_ESTADO_EMISION: Record<EstadoEmision, TonoEstado> = {
  borrador: "neutro",
  firmada: "ambar",
  emitida: "sello",
  revocada: "lacre",
};

export function estadoSello(estado: EstadoEmision): EstadoSello {
  if (estado === "emitida") return "valida";
  if (estado === "revocada") return "revocada";
  return "pendiente";
}

/** Transacción en stellar.expert, en la red configurada. */
export function enlaceTransaccion(txHash: string): string {
  const red = env.stellarNetwork === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${red}/tx/${txHash}`;
}

export function esBorrador(estado: EstadoEmision): boolean {
  return estado === "borrador" || estado === "firmada";
}

/** Más recientes primero. */
export function ordenarEmisiones<T extends { creadaEn: string }>(lista: T[]): T[] {
  return [...lista].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
}
