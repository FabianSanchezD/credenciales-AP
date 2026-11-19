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
import {
  carpetaSchema,
  organizacionSchema,
  plantillaIdSchema,
  plantillaSchema,
  renombrarCarpetaSchema,
  type OrganizacionDto,
} from './plantillas.schemas.js';
import { PlantillasService } from './plantillas.service.js';

@Controller('plantillas')
@Roles('emisor')
export class PlantillasController {
  constructor(private readonly plantillas: PlantillasService) {}

  @Get()
  listar(@SesionActual() sesion: SesionActiva): Promise<Plantilla[]> {
    return this.plantillas.listar(sesion.address);
  }

  // Carpetas antes de `:id` para que la ruta no se lea como un id.
  @Get('carpetas')
  carpetas(@SesionActual() sesion: SesionActiva): Promise<string[]> {
    return this.plantillas.carpetas(sesion.address);
  }

  @Post('carpetas')
  crearCarpeta(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: carpetaSchema }) dto: { ruta: string },
  ): Promise<string[]> {
    return this.plantillas.crearCarpeta(sesion.address, dto.ruta);
  }

  @Post('carpetas/renombrar')
  @HttpCode(HttpStatus.OK)
  renombrarCarpeta(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: renombrarCarpetaSchema }) dto: { de: string; a: string },
  ): Promise<string[]> {
    return this.plantillas.renombrarCarpeta(sesion.address, dto.de, dto.a);
  }

  @Post('carpetas/eliminar')
  @HttpCode(HttpStatus.OK)
  eliminarCarpeta(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: carpetaSchema }) dto: { ruta: string },
  ): Promise<string[]> {
    return this.plantillas.eliminarCarpeta(sesion.address, dto.ruta);
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

  @Put(':id/organizacion')
  organizar(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: plantillaIdSchema }) id: string,
    @Body({ schema: organizacionSchema }) dto: OrganizacionDto,
  ): Promise<Plantilla> {
    return this.plantillas.organizar(
      sesion.address,
      id,
      dto.carpeta,
      dto.etiquetas,
    );
  }

  @Post(':id/restaurar')
  @HttpCode(HttpStatus.OK)
  restaurar(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: plantillaIdSchema }) id: string,
  ): Promise<Plantilla> {
    return this.plantillas.restaurar(sesion.address, id);
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
