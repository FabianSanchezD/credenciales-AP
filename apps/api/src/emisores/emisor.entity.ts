import type {
  CategoriaEmisor as CategoriaContrato,
  Emisor as EmisorContrato,
  EmisorResumido as EmisorResumidoContrato,
  EstadoEmisor as EstadoContrato,
} from '@repo/cliente';

export const CATEGORIAS_EMISOR = [
  'universidad',
  'bootcamp',
  'plataforma_cursos',
  'empresa_certificadora',
  'universidad_publica',
  'universidad_privada',
  'colegio_profesional',
  'instituto_tecnico',
  'organizacion_empresarial',
] as const satisfies readonly CategoriaContrato[];

export type CategoriaEmisor = (typeof CATEGORIAS_EMISOR)[number];

/**
 * `pendiente` hasta que la entidad que autoriza (consola de gobernanza) lo
 * habilite. Puede pedir `correcciones` (la institución corrige y reenvía) o
 * dejar la solicitud `rechazado`. Solo un emisor `autorizado` puede emitir.
 */
export const ESTADOS_EMISOR = [
  'pendiente',
  'correcciones',
  'autorizado',
  'rechazado',
  'suspendido',
] as const satisfies readonly EstadoContrato[];

export type EstadoEmisor = (typeof ESTADOS_EMISOR)[number];

/** Forma definida en el contrato HTTP (`@repo/cliente`). */
export type Emisor = EmisorContrato;
export type EmisorResumido = EmisorResumidoContrato;

export function resumirEmisor(emisor: Emisor): EmisorResumido {
  return {
    id: emisor.id,
    nombre: emisor.nombre,
    did: emisor.did,
    categoria: emisor.categoria,
    sitioWeb: emisor.sitioWeb,
  };
}
