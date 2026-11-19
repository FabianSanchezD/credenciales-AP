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
  "universidad_publica",
  "universidad_privada",
  "colegio_profesional",
  "instituto_tecnico",
  "organizacion_empresarial",
] as const;
export type CategoriaEmisor = (typeof CATEGORIAS_EMISOR)[number];

export const ETIQUETAS_CATEGORIA: Record<CategoriaEmisor, string> = {
  universidad: "Universidad",
  bootcamp: "Bootcamp",
  plataforma_cursos: "Plataforma de cursos",
  empresa_certificadora: "Empresa certificadora",
  universidad_publica: "Universidad pública",
  universidad_privada: "Universidad privada",
  colegio_profesional: "Colegio profesional",
  instituto_tecnico: "Instituto de formación técnica",
  organizacion_empresarial: "Organización empresarial",
};

/** Categorías que ofrece el registro de cuentas (las anteriores siguen siendo válidas). */
export const CATEGORIAS_REGISTRO = [
  "universidad_publica",
  "universidad_privada",
  "colegio_profesional",
  "instituto_tecnico",
  "organizacion_empresarial",
] as const satisfies readonly CategoriaEmisor[];

/**
 * `pendiente` mientras la entidad que autoriza revisa la solicitud; puede
 * pedir `correcciones` (la institución corrige y reenvía) o dejarla
 * `rechazado`.
 */
export const ESTADOS_EMISOR = ["pendiente", "correcciones", "autorizado", "rechazado", "suspendido"] as const;
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

export const PROVINCIAS = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
] as const;
export type Provincia = (typeof PROVINCIAS)[number];

export const TIPOS_ID_INSTITUCION = ["cedula_juridica", "cedula_fisica"] as const;
export type TipoIdInstitucion = (typeof TIPOS_ID_INSTITUCION)[number];
export const TIPOS_ID_PERSONA = ["cedula_fisica", "dimex", "pasaporte"] as const;
export type TipoIdPersona = (typeof TIPOS_ID_PERSONA)[number];
export type TipoIdentificacion = TipoIdInstitucion | TipoIdPersona;

export const ETIQUETAS_TIPO_ID: Record<TipoIdentificacion, string> = {
  cedula_juridica: "Cédula jurídica",
  cedula_fisica: "Cédula física",
  dimex: "DIMEX",
  pasaporte: "Pasaporte",
};

/** Formato esperado de cada identificación (con guiones donde aplica). */
export const FORMATOS_ID: Record<TipoIdentificacion, { patron: RegExp; ejemplo: string }> = {
  cedula_juridica: { patron: /^\d-\d{3}-\d{6}$/, ejemplo: "3-101-123456" },
  cedula_fisica: { patron: /^\d-\d{4}-\d{4}$/, ejemplo: "1-1234-5678" },
  dimex: { patron: /^\d{11,12}$/, ejemplo: "155812345678" },
  pasaporte: { patron: /^[A-Z0-9]{5,20}$/, ejemplo: "A1234567" },
};

/** Proveedores de correo personal: la cuenta debe usar un correo institucional. */
export const DOMINIOS_CORREO_PERSONAL = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
] as const;

export interface DatosInstitucion {
  nombre: string;
  categoria: CategoriaEmisor;
  tipoIdentificacion: TipoIdInstitucion;
  identificacion: string;
  /** Correo institucional; también es el usuario de la cuenta. */
  correo: string;
  sitioWeb: string;
  provincia: Provincia;
}

export interface DatosRepresentante {
  nombre: string;
  tipoIdentificacion: TipoIdPersona;
  identificacion: string;
  cargo: string;
  correo: string;
  telefono: string;
}

/** Datos de registro de una institución. Solo los ven ella y la entidad que autoriza. */
export interface RegistroEmisor {
  emisorId: string;
  institucion: DatosInstitucion;
  representante: DatosRepresentante;
  correoVerificadoEn: string;
  actualizadoEn: string;
}

export interface CodigoEnviado {
  expiraEn: string;
  /** Solo fuera de producción, mientras no haya envío de correos. */
  codigoDesarrollo?: string;
}

export interface CorreoVerificado {
  /** Comprobante de un solo uso para crear la cuenta. */
  verificacionId: string;
  expiraEn: string;
}

export interface NuevaCuentaEmisor {
  institucion: DatosInstitucion;
  representante: DatosRepresentante;
  contrasena: string;
  verificacionId: string;
  /** Desafío firmado con la cuenta de firma de la institución (rol `emisor`). */
  desafioId: string;
  firma: FirmaMensaje;
  /** Semilla de la cuenta de firma cifrada con la contraseña en el navegador. */
  llaveCifrada: string;
}

export interface LlaveEmisor {
  llaveCifrada: string;
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
