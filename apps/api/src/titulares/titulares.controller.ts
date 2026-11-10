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
import { emisorIdSchema } from '../emisores/emisores.schemas.js';
import type { Titular } from './titular.entity.js';
import {
  registrarTitularSchema,
  titularIdSchema,
  type RegistrarTitularDto,
} from './titulares.schemas.js';
import { TitularesService } from './titulares.service.js';

@Controller('emisores/:emisorId/titulares')
export class TitularesController {
  constructor(private readonly titulares: TitularesService) {}

  @Get()
  findAll(
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
  ): Promise<Titular[]> {
    return this.titulares.findByEmisor(emisorId);
  }

  @Post()
  register(
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
    @Body({ schema: registrarTitularSchema }) dto: RegistrarTitularDto,
  ): Promise<Titular> {
    return this.titulares.register(emisorId, dto);
  }

  @Delete(':titularId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('emisorId', { schema: emisorIdSchema }) emisorId: string,
    @Param('titularId', { schema: titularIdSchema }) titularId: string,
  ): Promise<void> {
    return this.titulares.remove(emisorId, titularId);
  }
}
