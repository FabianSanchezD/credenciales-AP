import type { Rol as RolContrato } from '@repo/cliente';

export const ROLES = [
  'emisor',
  'titular',
  'gobernanza',
] as const satisfies readonly RolContrato[];

export type Rol = (typeof ROLES)[number];

/** Lo que el almacén temporal guarda por sesión: sin datos personales. */
export interface SesionActiva {
  rol: Rol;
  address: string;
  did: string;
  expiraEn: string;
}

export interface DesafioPendiente {
  rol: Rol;
  address: string;
  mensaje: string;
  expiraEn: string;
}

/** Petición HTTP con la sesión que adjunta el guard. */
export interface PeticionConSesion {
  headers: Record<string, string | string[] | undefined>;
  sesion?: SesionActiva;
  tokenSesion?: string;
}
