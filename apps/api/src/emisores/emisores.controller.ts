import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { Emisor } from './emisor.entity.js';
import {
  actualizarEmisorSchema,
  crearEmisorSchema,
  emisorIdSchema,
  type ActualizarEmisorDto,
  type CrearEmisorDto,
} from './emisores.schemas.js';
import { EmisoresService } from './emisores.service.js';

@Controller('emisores')
export class EmisoresController {
  constructor(private readonly emisores: EmisoresService) {}

  @Get()
  findAll(): Promise<Emisor[]> {
    return this.emisores.findAll();
  }

  @Get(':emisorId')
  findOne(
    @Param('emisorId', { schema: emisorIdSchema }) id: string,
  ): Promise<Emisor> {
    return this.emisores.findOne(id);
  }

  @Post()
  create(
    @Body({ schema: crearEmisorSchema }) dto: CrearEmisorDto,
  ): Promise<Emisor> {
    return this.emisores.create(dto);
  }

  @Patch(':emisorId')
  update(
    @Param('emisorId', { schema: emisorIdSchema }) id: string,
    @Body({ schema: actualizarEmisorSchema }) dto: ActualizarEmisorDto,
  ): Promise<Emisor> {
    return this.emisores.update(id, dto);
  }
}
