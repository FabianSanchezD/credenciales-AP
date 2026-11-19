import {
  createParamDecorator,
  SetMetadata,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import {
  ROLES,
  type PeticionConSesion,
  type Rol,
  type SesionActiva,
} from './sesion.js';

export const ROLES_METADATA = 'credenciales:roles';

/** Exige una sesión con alguno de los roles indicados. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_METADATA, roles);

/** Exige una sesión de cualquier rol. */
export const Autenticado = () => Roles(...ROLES);

/** Inyecta la sesión que validó `SesionGuard`. */
export const SesionActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SesionActiva => {
    const peticion = ctx.switchToHttp().getRequest<PeticionConSesion>();
    if (!peticion.sesion) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }
    return peticion.sesion;
  },
);

/** Token Bearer de la petición (solo en rutas autenticadas). */
export const TokenSesion = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const peticion = ctx.switchToHttp().getRequest<PeticionConSesion>();
    if (!peticion.tokenSesion) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }
    return peticion.tokenSesion;
  },
);
