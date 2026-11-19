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
] as const satisfies readonly CategoriaContrato[];

export type CategoriaEmisor = (typeof CATEGORIAS_EMISOR)[number];

/**
 * `pendiente` hasta que la entidad que autoriza (consola de gobernanza) lo
 * habilite. Solo un emisor `autorizado` puede emitir credenciales.
 */
export const ESTADOS_EMISOR = [
  'pendiente',
  'autorizado',
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
