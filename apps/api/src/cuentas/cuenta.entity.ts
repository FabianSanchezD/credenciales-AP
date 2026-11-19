import type {
  DatosInstitucion as DatosInstitucionContrato,
  DatosRepresentante as DatosRepresentanteContrato,
  Provincia as ProvinciaContrato,
  RegistroEmisor as RegistroEmisorContrato,
  TipoIdInstitucion as TipoIdInstitucionContrato,
  TipoIdPersona as TipoIdPersonaContrato,
} from '@repo/cliente';
import type { CategoriaEmisor } from '../emisores/emisor.entity.js';

export const PROVINCIAS = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
] as const satisfies readonly ProvinciaContrato[];

export const TIPOS_ID_INSTITUCION = [
  'cedula_juridica',
  'cedula_fisica',
] as const satisfies readonly TipoIdInstitucionContrato[];

export const TIPOS_ID_PERSONA = [
  'cedula_fisica',
  'dimex',
  'pasaporte',
] as const satisfies readonly TipoIdPersonaContrato[];

export type TipoIdentificacion =
  (typeof TIPOS_ID_INSTITUCION)[number] | (typeof TIPOS_ID_PERSONA)[number];

/** Mismos formatos que muestra el portal del emisor. */
export const FORMATOS_ID: Record<TipoIdentificacion, RegExp> = {
  cedula_juridica: /^\d-\d{3}-\d{6}$/,
  cedula_fisica: /^\d-\d{4}-\d{4}$/,
  dimex: /^\d{11,12}$/,
  pasaporte: /^[A-Z0-9]{5,20}$/,
};

/** Categorías que se pueden elegir al crear una cuenta. */
export const CATEGORIAS_REGISTRO = [
  'universidad_publica',
  'universidad_privada',
  'colegio_profesional',
  'instituto_tecnico',
  'organizacion_empresarial',
] as const satisfies readonly CategoriaEmisor[];

/** La cuenta debe usar un correo institucional, no uno personal. */
export const DOMINIOS_CORREO_PERSONAL = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'live.com',
];

export type DatosInstitucion = DatosInstitucionContrato;
export type DatosRepresentante = DatosRepresentanteContrato;
export type RegistroEmisor = RegistroEmisorContrato;

/** Credenciales de acceso de una institución. Nunca sale de la API. */
export interface CuentaEmisor {
  id: string;
  correo: string;
  hashContrasena: string;
  emisorId: string;
  correoVerificadoEn: string;
  creadaEn: string;
}
