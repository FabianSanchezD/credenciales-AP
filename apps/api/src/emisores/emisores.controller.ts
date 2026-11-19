import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles, SesionActual } from '../auth/decoradores.js';
import type { SesionActiva } from '../auth/sesion.js';
import type { Emisor, EstadoEmisor } from './emisor.entity.js';
import {
  actualizarEmisorSchema,
  cambiarEstadoSchema,
  crearEmisorSchema,
  emisorIdSchema,
  filtroEstadoSchema,
  type ActualizarEmisorDto,
  type CambiarEstadoDto,
  type CrearEmisorDto,
} from './emisores.schemas.js';
import { EmisoresService } from './emisores.service.js';

@Controller('emisores')
export class EmisoresController {
  constructor(private readonly emisores: EmisoresService) {}

  /** Registro de confianza público. */
  @Get()
  findAll(
    @Query('estado', { schema: filtroEstadoSchema }) estado?: EstadoEmisor,
  ): Promise<Emisor[]> {
    return this.emisores.findAll(estado);
  }

  @Get(':emisorId')
  findOne(
    @Param('emisorId', { schema: emisorIdSchema }) id: string,
  ): Promise<Emisor> {
    return this.emisores.findOne(id);
  }

  @Post()
  @Roles('emisor')
  create(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: crearEmisorSchema }) dto: CrearEmisorDto,
  ): Promise<Emisor> {
    return this.emisores.create(sesion.address, dto);
  }

  @Patch(':emisorId')
  @Roles('emisor')
  update(
    @SesionActual() sesion: SesionActiva,
    @Param('emisorId', { schema: emisorIdSchema }) id: string,
    @Body({ schema: actualizarEmisorSchema }) dto: ActualizarEmisorDto,
  ): Promise<Emisor> {
    return this.emisores.update(id, sesion.address, dto);
  }

  @Post(':emisorId/estado')
  @Roles('gobernanza')
  cambiarEstado(
    @Param('emisorId', { schema: emisorIdSchema }) id: string,
    @Body({ schema: cambiarEstadoSchema }) dto: CambiarEstadoDto,
  ): Promise<Emisor> {
    return this.emisores.cambiarEstado(id, dto);
  }
}
