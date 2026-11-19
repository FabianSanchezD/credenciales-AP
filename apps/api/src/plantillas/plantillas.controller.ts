import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import type { ContenidoPlantilla } from '@repo/credenciales';
import { Roles, SesionActual } from '../auth/decoradores.js';
import type { SesionActiva } from '../auth/sesion.js';
import type { Plantilla } from './plantilla.entity.js';
import { plantillaIdSchema, plantillaSchema } from './plantillas.schemas.js';
import { PlantillasService } from './plantillas.service.js';

@Controller('plantillas')
@Roles('emisor')
export class PlantillasController {
  constructor(private readonly plantillas: PlantillasService) {}

  @Get()
  listar(@SesionActual() sesion: SesionActiva): Promise<Plantilla[]> {
    return this.plantillas.listar(sesion.address);
  }

  @Get(':id')
  obtener(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: plantillaIdSchema }) id: string,
  ): Promise<Plantilla> {
    return this.plantillas.obtener(sesion.address, id);
  }

  @Post()
  crear(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: plantillaSchema }) contenido: ContenidoPlantilla,
  ): Promise<Plantilla> {
    return this.plantillas.crear(sesion.address, contenido);
  }

  @Put(':id')
  actualizar(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: plantillaIdSchema }) id: string,
    @Body({ schema: plantillaSchema }) contenido: ContenidoPlantilla,
  ): Promise<Plantilla> {
    return this.plantillas.actualizar(sesion.address, id, contenido);
  }

  @Post(':id/archivar')
  @HttpCode(HttpStatus.OK)
  archivar(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: plantillaIdSchema }) id: string,
  ): Promise<Plantilla> {
    return this.plantillas.archivar(sesion.address, id);
  }
}
