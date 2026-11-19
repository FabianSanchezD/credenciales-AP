import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { ResultadoVerificacion } from '@repo/cliente';
import { verificarSchema, type VerificarDto } from './verificacion.schemas.js';
import { VerificacionService } from './verificacion.service.js';

/** Público: no requiere cuenta (RF-08) y no guarda nada de lo presentado. */
@Controller('verificaciones')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class VerificacionController {
  constructor(private readonly verificacion: VerificacionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  verificar(
    @Body({ schema: verificarSchema }) dto: VerificarDto,
  ): Promise<ResultadoVerificacion> {
    return this.verificacion.verificar(dto);
  }
}
