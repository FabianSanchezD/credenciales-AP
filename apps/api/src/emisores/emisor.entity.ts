export const CATEGORIAS_EMISOR = [
  'universidad',
  'bootcamp',
  'plataforma_cursos',
  'empresa_certificadora',
] as const;

export type CategoriaEmisor = (typeof CATEGORIAS_EMISOR)[number];

/**
 * `pendiente` hasta que la entidad que autoriza (consola de gobernanza) lo
 * habilite. Solo un emisor `autorizado` podrá emitir credenciales.
 */
export const ESTADOS_EMISOR = ['pendiente', 'autorizado', 'suspendido'] as const;

export type EstadoEmisor = (typeof ESTADOS_EMISOR)[number];

export interface Emisor {
  id: string;
  nombre: string;
  categoria: CategoriaEmisor;
  sitioWeb: string | null;
  /** Cuenta Stellar con la que el emisor firma (did:stellar). */
  stellarAddress: string;
  did: string;
  estado: EstadoEmisor;
  creadoEn: string;
  actualizadoEn: string;
}
