/**
 * Contrato HTTP entre la API (apps/api) y las web apps. La API debe responder
 * exactamente estas formas; las apps solo usan estos tipos.
 */
import type {
  AtributosSeleccionables,
  ContenidoPlantilla,
  CredencialFirmada,
  Divulgacion,
  FirmaMensaje,
  Presentacion,
} from "@repo/credenciales";

export type Rol = "emisor" | "titular" | "gobernanza";

export const CATEGORIAS_EMISOR = [
  "universidad",
  "bootcamp",
  "plataforma_cursos",
  "empresa_certificadora",
] as const;
export type CategoriaEmisor = (typeof CATEGORIAS_EMISOR)[number];

export const ETIQUETAS_CATEGORIA: Record<CategoriaEmisor, string> = {
  universidad: "Universidad",
  bootcamp: "Bootcamp",
  plataforma_cursos: "Plataforma de cursos",
  empresa_certificadora: "Empresa certificadora",
};

export const ESTADOS_EMISOR = ["pendiente", "autorizado", "suspendido"] as const;
export type EstadoEmisor = (typeof ESTADOS_EMISOR)[number];

export interface Emisor {
  id: string;
  nombre: string;
  categoria: CategoriaEmisor;
  sitioWeb: string | null;
  stellarAddress: string;
  did: string;
  estado: EstadoEmisor;
  /** Motivo del último cambio de estado, escrito por la entidad que autoriza. */
  motivoEstado: string | null;
  autorizadoEn: string | null;
  suspendidoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Desafio {
  desafioId: string;
  /** Texto que la wallet debe firmar tal cual. */
  mensaje: string;
  expiraEn: string;
}

export interface Sesion {
  token: string;
  rol: Rol;
  address: string;
  did: string;
  expiraEn: string;
  /** Solo para rol `emisor`: el emisor registrado con esa cuenta, si existe. */
  emisor: Emisor | null;
}

export type SesionSinToken = Omit<Sesion, "token">;

export interface TitularInscrito {
  id: string;
  emisorId: string;
  did: string;
  stellarAddress: string;
  registradoEn: string;
}

export interface Plantilla extends ContenidoPlantilla {
  id: string;
  emisorId: string;
  version: number;
  archivada: boolean;
  creadaEn: string;
  actualizadaEn: string;
}

export const ESTADOS_EMISION = ["borrador", "firmada", "emitida", "revocada"] as const;
export type EstadoEmision = (typeof ESTADOS_EMISION)[number];

export interface Emision {
  /** También es el `vcId` de la credencial. */
  id: string;
  emisorId: string;
  plantillaId: string;
  plantillaNombre: string;
  titularDid: string;
  estado: EstadoEmision;
  /** SHA-256 (hex) anclado. Existe desde que el emisor firma la credencial. */
  hash: string | null;
  txHash: string | null;
  emitidaEn: string | null;
  revocadaEn: string | null;
  motivoRevocacion: string | null;
  txRevocacion: string | null;
  creadaEn: string;
}

export interface TransaccionPorFirmar {
  xdr: string;
  networkPassphrase: string;
}

export interface EmisionPreparada {
  emision: Emision;
  /** Credencial canónica sin `proof`: la wallet del emisor la firma (SEP-53). */
  mensajeAFirmar: string;
}

export interface EmisionFirmada {
  emision: Emision;
  /** Transacción que ancla el hash; la firma la cuenta del emisor. */
  transaccion: TransaccionPorFirmar;
}

export interface RevocacionPreparada {
  emision: Emision;
  transaccion: TransaccionPorFirmar;
}

export interface EmisorResumido {
  id: string;
  nombre: string;
  did: string;
  categoria: CategoriaEmisor;
  sitioWeb: string | null;
}

export interface CredencialEnBoveda {
  vcId: string;
  credencial: CredencialFirmada;
  divulgaciones: Divulgacion[];
  emisor: EmisorResumido;
  estado: "valida" | "revocada";
  emitidaEn: string;
  revocadaEn: string | null;
  motivoRevocacion: string | null;
}

export type IdComprobacion = "firma" | "integridad" | "estado" | "emisor";

export interface Comprobacion {
  id: IdComprobacion;
  ok: boolean;
  /** Explicación en español para el verificador. */
  detalle: string;
}

export interface ResultadoVerificacion {
  resultado: "valida" | "revocada" | "invalida";
  comprobaciones: Comprobacion[];
  emisor: EmisorResumido | null;
  /** Lo que muestra la credencial aunque no supere la verificación. */
  emisorDeclarado: { did: string; nombre: string };
  logro: { nombre: string; descripcion: string };
  titularDid: string;
  emitidaEn: string;
  validaHasta: string | null;
  revocadaEn: string | null;
  atributos: Partial<AtributosSeleccionables>;
  verificadaEn: string;
  duracionMs: number;
}

export interface Indicador {
  id: string;
  nombre: string;
  salvaguarda: string;
  valor: string;
  meta: string;
  cumple: boolean;
}

export interface ResumenGobernanza {
  emisores: Record<EstadoEmisor, number>;
  credenciales: { emitidas: number; revocadas: number };
  titulares: number;
  plantillas: number;
  indicadores: Indicador[];
}

export interface ConfigPublica {
  network: "testnet" | "mainnet";
  networkPassphrase: string;
  horizonUrl: string;
  friendbot: boolean;
  anclaje: "stellar" | "acta";
}

export type CuerpoVerificacion = { presentacion: Presentacion } | { codigo: string };
export type { FirmaMensaje };
