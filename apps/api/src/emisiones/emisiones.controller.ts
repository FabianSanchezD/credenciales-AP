import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type {
  EmisionFirmada,
  EmisionPreparada,
  RevocacionPreparada,
} from '@repo/cliente';
import { Roles, SesionActual } from '../auth/decoradores.js';
import type { SesionActiva } from '../auth/sesion.js';
import type { Emision } from './emision.entity.js';
import {
  emisionIdSchema,
  enviarTransaccionSchema,
  firmarEmisionSchema,
  prepararEmisionSchema,
  revocarSchema,
  type EnviarTransaccionDto,
  type FirmarEmisionDto,
  type PrepararEmisionDto,
  type RevocarDto,
} from './emisiones.schemas.js';
import { EmisionesService } from './emisiones.service.js';

@Controller('emisiones')
@Roles('emisor')
export class EmisionesController {
  constructor(private readonly emisiones: EmisionesService) {}

  @Get()
  listar(@SesionActual() sesion: SesionActiva): Promise<Emision[]> {
    return this.emisiones.listar(sesion.address);
  }

  @Get(':id')
  obtener(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: emisionIdSchema }) id: string,
  ): Promise<Emision> {
    return this.emisiones.obtener(sesion.address, id);
  }

  @Post()
  preparar(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: prepararEmisionSchema }) dto: PrepararEmisionDto,
  ): Promise<EmisionPreparada> {
    return this.emisiones.preparar(sesion.address, dto);
  }

  @Post(':id/firma')
  @HttpCode(HttpStatus.OK)
  firmar(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: emisionIdSchema }) id: string,
    @Body({ schema: firmarEmisionSchema }) dto: FirmarEmisionDto,
  ): Promise<EmisionFirmada> {
    return this.emisiones.firmar(sesion.address, id, dto.firma);
  }

  @Post(':id/envio')
  @HttpCode(HttpStatus.OK)
  enviar(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: emisionIdSchema }) id: string,
    @Body({ schema: enviarTransaccionSchema }) dto: EnviarTransaccionDto,
  ): Promise<Emision> {
    return this.emisiones.enviar(sesion.address, id, dto.signedXdr);
  }

  @Post(':id/revocacion')
  @HttpCode(HttpStatus.OK)
  prepararRevocacion(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: emisionIdSchema }) id: string,
    @Body({ schema: revocarSchema }) dto: RevocarDto,
  ): Promise<RevocacionPreparada> {
    return this.emisiones.prepararRevocacion(sesion.address, id, dto.motivo);
  }

  @Post(':id/revocacion/envio')
  @HttpCode(HttpStatus.OK)
  enviarRevocacion(
    @SesionActual() sesion: SesionActiva,
    @Param('id', { schema: emisionIdSchema }) id: string,
    @Body({ schema: enviarTransaccionSchema }) dto: EnviarTransaccionDto,
  ): Promise<Emision> {
    return this.emisiones.enviarRevocacion(sesion.address, id, dto.signedXdr);
  }
}
