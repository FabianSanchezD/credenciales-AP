import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { ROLES_METADATA } from './decoradores.js';
import type { PeticionConSesion, Rol } from './sesion.js';

const ETIQUETA_ROL: Record<Rol, string> = {
  emisor: 'una institución emisora',
  titular: 'un titular',
  gobernanza: 'la entidad que autoriza',
};

/**
 * Guard global: las rutas sin `@Roles()` son públicas; las demás exigen un
 * token Bearer vigente con uno de los roles indicados.
 */
@Injectable()
export class SesionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;

    const peticion = context.switchToHttp().getRequest<PeticionConSesion>();
    const token = extraerToken(peticion.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Debes iniciar sesión');
    }
    const sesion = await this.auth.sesionPorToken(token);
    if (!sesion) {
      throw new UnauthorizedException(
        'Tu sesión venció o no es válida. Inicia sesión de nuevo.',
      );
    }
    if (!roles.includes(sesion.rol)) {
      const esperado = roles.map((rol) => ETIQUETA_ROL[rol]).join(' o ');
      throw new ForbiddenException(`Esta acción es solo para ${esperado}`);
    }
    peticion.sesion = sesion;
    peticion.tokenSesion = token;
    return true;
  }
}

function extraerToken(cabecera: string | string[] | undefined): string | null {
  if (typeof cabecera !== 'string') return null;
  const [tipo, token] = cabecera.split(' ');
  return tipo?.toLowerCase() === 'bearer' && token ? token : null;
}
