import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import type { CredencialEnBoveda } from '@repo/cliente';
import { Roles, SesionActual } from '../auth/decoradores.js';
import type { SesionActiva } from '../auth/sesion.js';
import type { Emisor } from '../emisores/emisor.entity.js';
import { emisorIdSchema } from '../emisores/emisores.schemas.js';
import { BovedaService } from './boveda.service.js';

@Controller('boveda')
@Roles('titular')
export class BovedaController {
  constructor(private readonly boveda: BovedaService) {}

  @Get()
  listar(@SesionActual() sesion: SesionActiva): Promise<CredencialEnBoveda[]> {
    return this.boveda.listar(sesion.address);
  }

  @Get('bloqueos')
  listarBloqueos(@SesionActual() sesion: SesionActiva): Promise<Emisor[]> {
    return this.boveda.listarBloqueos(sesion.address);
  }

  @Put('bloqueos/:emisorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  bloquear(
    @SesionActual() sesion: SesionActiva,
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
  ): Promise<void> {
    return this.boveda.bloquear(sesion.address, emisorId);
  }

  @Delete('bloqueos/:emisorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  desbloquear(
    @SesionActual() sesion: SesionActiva,
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
  ): Promise<void> {
    return this.boveda.desbloquear(sesion.address, emisorId);
  }
}
