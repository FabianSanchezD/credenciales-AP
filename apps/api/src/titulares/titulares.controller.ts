import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Roles, SesionActual } from '../auth/decoradores.js';
import type { SesionActiva } from '../auth/sesion.js';
import { emisorIdSchema } from '../emisores/emisores.schemas.js';
import type { Titular } from './titular.entity.js';
import {
  registrarTitularSchema,
  titularIdSchema,
  type RegistrarTitularDto,
} from './titulares.schemas.js';
import { TitularesService } from './titulares.service.js';

@Controller('emisores/:emisorId/titulares')
@Roles('emisor')
export class TitularesController {
  constructor(private readonly titulares: TitularesService) {}

  @Get()
  findAll(
    @SesionActual() sesion: SesionActiva,
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
  ): Promise<Titular[]> {
    return this.titulares.findByEmisor(emisorId, sesion.address);
  }

  @Post()
  register(
    @SesionActual() sesion: SesionActiva,
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
    @Body({ schema: registrarTitularSchema }) dto: RegistrarTitularDto,
  ): Promise<Titular> {
    return this.titulares.register(emisorId, sesion.address, dto);
  }

  @Delete(':titularId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @SesionActual() sesion: SesionActiva,
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
    @Param('titularId', { schema: titularIdSchema }) titularId: string,
  ): Promise<void> {
    return this.titulares.remove(emisorId, sesion.address, titularId);
  }
}
