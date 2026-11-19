import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Desafio, Sesion, SesionSinToken } from '@repo/cliente';
import {
  crearDesafioSchema,
  crearSesionSchema,
  type CrearDesafioDto,
  type CrearSesionDto,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';
import { Autenticado, SesionActual, TokenSesion } from './decoradores.js';
import type { SesionActiva } from './sesion.js';

@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('desafios')
  crearDesafio(
    @Body({ schema: crearDesafioSchema }) dto: CrearDesafioDto,
  ): Promise<Desafio> {
    return this.auth.crearDesafio(dto);
  }

  @Post('sesiones')
  crearSesion(
    @Body({ schema: crearSesionSchema }) dto: CrearSesionDto,
  ): Promise<Sesion> {
    return this.auth.crearSesion(dto);
  }

  @Get('sesion')
  @Autenticado()
  sesion(@SesionActual() sesion: SesionActiva): Promise<SesionSinToken> {
    return this.auth.describir(sesion);
  }

  @Delete('sesion')
  @Autenticado()
  @HttpCode(HttpStatus.NO_CONTENT)
  cerrar(@TokenSesion() token: string): Promise<void> {
    return this.auth.cerrarSesion(token);
  }
}
