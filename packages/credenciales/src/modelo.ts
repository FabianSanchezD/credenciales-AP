import { isDidStellar } from "@repo/stellar";
import { z } from "zod";
import { ESQUEMAS_FIRMA } from "./firmas.js";

export const NIVELES = ["basico", "intermedio", "avanzado"] as const;
export const MODALIDADES = ["presencial", "virtual", "hibrida"] as const;
/** El aprendizaje informal no se acredita (sección 2.2 del entregable). */
export const TIPOS_APRENDIZAJE = ["formal", "no_formal"] as const;

export type Nivel = (typeof NIVELES)[number];
export type Modalidad = (typeof MODALIDADES)[number];
export type TipoAprendizaje = (typeof TIPOS_APRENDIZAJE)[number];

export const ETIQUETAS_NIVEL: Record<Nivel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};
export const ETIQUETAS_MODALIDAD: Record<Modalidad, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
  hibrida: "Híbrida",
};
export const ETIQUETAS_TIPO_APRENDIZAJE: Record<TipoAprendizaje, string> = {
  formal: "Formal",
  no_formal: "No formal",
};

const textoCorto = z.string().trim().min(1).max(200);
const textoLargo = z.string().trim().min(1).max(2000);

/** Documentos con los que el emisor puede identificar al titular. */
export const TIPOS_IDENTIFICACION = ["cedula", "carne", "dimex", "pasaporte"] as const;
export type TipoIdentificacion = (typeof TIPOS_IDENTIFICACION)[number];
export const ETIQUETAS_TIPO_IDENTIFICACION: Record<TipoIdentificacion, string> = {
  cedula: "Cédula de identidad",
  carne: "Carné institucional",
  dimex: "DIMEX",
  pasaporte: "Pasaporte",
};

export const identificacionSchema = z.object({
  tipo: z.enum(TIPOS_IDENTIFICACION),
  numero: z.string().trim().min(1).max(40),
});
export type Identificacion = z.infer<typeof identificacionSchema>;

/** Nombre del titular tal como lo registra la institución. */
export const nombreTitularSchema = z.string().trim().min(2).max(200);

export const didStellarSchema = z
  .string()
  .refine(isDidStellar, { message: "Debe ser un did:stellar válido" });

/** Contexto formativo obligatorio (salvaguarda S1). */
export const contextoSchema = z.object({
  horas: z.number().positive().max(10000),
  nivel: z.enum(NIVELES),
  modalidad: z.enum(MODALIDADES),
  tipoAprendizaje: z.enum(TIPOS_APRENDIZAJE),
});
export type Contexto = z.infer<typeof contextoSchema>;

/**
 * Contenido académico de una plantilla. Lo define el emisor (autonomía del
 * emisor) y la plataforma solo valida que esté completo.
 */
export const contenidoPlantillaSchema = z.object({
  nombre: textoCorto,
  descripcion: textoLargo,
  resultadosAprendizaje: z.array(textoCorto).min(1).max(30),
  temasEvaluados: z.array(textoCorto).max(50).default([]),
  contexto: contextoSchema,
  /** Meses de vigencia; `null` si la credencial no vence. */
  vigenciaMeses: z.number().int().positive().max(600).nullable().default(null),
});
export type ContenidoPlantilla = z.infer<typeof contenidoPlantillaSchema>;

/** Atributos que el titular puede revelar u ocultar al presentar. */
export const ATRIBUTOS_SELECCIONABLES = [
  "nombreTitular",
  "identificacion",
  "resultadosAprendizaje",
  "temasEvaluados",
  "contexto",
  "calificacion",
] as const;
export type AtributoSeleccionable = (typeof ATRIBUTOS_SELECCIONABLES)[number];

export const ETIQUETAS_ATRIBUTO: Record<AtributoSeleccionable, string> = {
  nombreTitular: "Nombre del titular",
  identificacion: "Identificación",
  resultadosAprendizaje: "Resultados de aprendizaje",
  temasEvaluados: "Temas evaluados",
  contexto: "Contexto formativo",
  calificacion: "Calificación",
};

/**
 * El nombre y la identificación del titular viajan solo dentro de la
 * credencial (cifrada en reposo, nunca en la blockchain) y el titular decide
 * si los revela. Son opcionales para seguir leyendo credenciales anteriores.
 */
export interface AtributosSeleccionables {
  nombreTitular?: string;
  identificacion?: Identificacion;
  resultadosAprendizaje: string[];
  temasEvaluados: string[];
  contexto: Contexto;
  calificacion?: string;
}

/** `[sal, nombre del atributo, valor]`, igual que SD-JWT. */
export const divulgacionSchema = z.tuple([
  z.string().min(16),
  z.enum(ATRIBUTOS_SELECCIONABLES),
  z.unknown(),
]);
export type Divulgacion = z.infer<typeof divulgacionSchema>;

export const TIPO_CREDENCIAL = "MicrocredencialAcademica";
export const CONTEXTOS_VC = [
  "https://www.w3.org/ns/credentials/v2",
  "https://www.w3.org/ns/credentials/examples/v2",
] as const;

export const TIPOS_ESTADO = ["StellarDataEntryStatus", "ActaVaultStatus"] as const;
export type TipoEstado = (typeof TIPOS_ESTADO)[number];

export const estadoCredencialSchema = z.object({
  id: z.string().min(1),
  type: z.enum(TIPOS_ESTADO),
  statusPurpose: z.literal("revocation"),
  /** Cuenta donde vive el anclaje: la del emisor (`stellar`) o la del titular (`acta`). */
  cuenta: z.string().min(1),
  vcId: z.string().min(1),
});
export type EstadoCredencial = z.infer<typeof estadoCredencialSchema>;

export const CRYPTOSUITE = "stellar-sep53-jcs-2026";

export const pruebaSchema = z.object({
  type: z.literal("DataIntegrityProof"),
  cryptosuite: z.literal(CRYPTOSUITE),
  created: z.string().min(1),
  verificationMethod: z.string().min(1),
  proofPurpose: z.literal("assertionMethod"),
  esquemaFirma: z.enum(ESQUEMAS_FIRMA),
  proofValue: z.string().min(1),
});
export type Prueba = z.infer<typeof pruebaSchema>;

export const credencialSchema = z.object({
  "@context": z.array(z.string()).min(1),
  type: z.array(z.string()).min(1),
  id: z.string().startsWith("urn:uuid:"),
  issuer: z.object({ id: didStellarSchema, name: textoCorto }),
  validFrom: z.string().min(1),
  validUntil: z.string().min(1).optional(),
  credentialSubject: z.object({
    id: didStellarSchema,
    logro: z.object({ nombre: textoCorto, descripcion: textoLargo }),
    _sd: z.array(z.string().min(1)).min(1),
  }),
  credentialStatus: estadoCredencialSchema,
  proof: pruebaSchema.optional(),
});
export type Credencial = z.infer<typeof credencialSchema>;
export type CredencialFirmada = Credencial & { proof: Prueba };

export const presentacionSchema = z.object({
  v: z.literal(1),
  credencial: credencialSchema.extend({ proof: pruebaSchema }),
  divulgaciones: z.array(divulgacionSchema).max(ATRIBUTOS_SELECCIONABLES.length),
});
export type Presentacion = z.infer<typeof presentacionSchema>;
