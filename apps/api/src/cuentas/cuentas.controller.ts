import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { CodigoEnviado, CorreoVerificado, Sesion } from '@repo/cliente';
import { Roles, SesionActual } from '../auth/decoradores.js';
import type { SesionActiva } from '../auth/sesion.js';
import type { RegistroEmisor } from './cuenta.entity.js';
import {
  actualizarDatosSchema,
  cambiarContrasenaSchema,
  corregirRegistroSchema,
  crearCuentaSchema,
  emisorIdRegistroSchema,
  enviarCodigoSchema,
  ingresarSchema,
  verificarCodigoSchema,
  type ActualizarDatosDto,
  type CambiarContrasenaDto,
  type CorregirRegistroDto,
  type CrearCuentaDto,
  type EnviarCodigoDto,
  type IngresarDto,
  type VerificarCodigoDto,
} from './cuentas.schemas.js';
import { CuentasService } from './cuentas.service.js';

@Controller('cuentas')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  @Post('codigos')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  enviarCodigo(
    @Body({ schema: enviarCodigoSchema }) dto: EnviarCodigoDto,
  ): Promise<CodigoEnviado> {
    return this.cuentas.enviarCodigo(dto);
  }

  @Post('codigos/verificacion')
  verificarCodigo(
    @Body({ schema: verificarCodigoSchema }) dto: VerificarCodigoDto,
  ): Promise<CorreoVerificado> {
    return this.cuentas.verificarCodigo(dto);
  }

  @Post()
  crear(
    @Body({ schema: crearCuentaSchema }) dto: CrearCuentaDto,
  ): Promise<Sesion> {
    return this.cuentas.crear(dto);
  }

  @Post('sesiones')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  ingresar(
    @Body({ schema: ingresarSchema }) dto: IngresarDto,
  ): Promise<Sesion> {
    return this.cuentas.ingresar(dto);
  }

  @Get('llave')
  @Roles('emisor')
  miLlave(
    @SesionActual() sesion: SesionActiva,
  ): Promise<{ llaveCifrada: string }> {
    return this.cuentas.miLlave(sesion);
  }

  @Get('registro')
  @Roles('emisor')
  miRegistro(@SesionActual() sesion: SesionActiva): Promise<RegistroEmisor> {
    return this.cuentas.miRegistro(sesion);
  }

  @Put('registro')
  @Roles('emisor')
  corregir(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: corregirRegistroSchema }) dto: CorregirRegistroDto,
  ): Promise<RegistroEmisor> {
    return this.cuentas.corregir(sesion, dto);
  }

  @Patch('registro')
  @Roles('emisor')
  actualizarDatos(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: actualizarDatosSchema }) dto: ActualizarDatosDto,
  ): Promise<RegistroEmisor> {
    return this.cuentas.actualizarDatos(sesion, dto);
  }

  @Post('contrasena')
  @Roles('emisor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  cambiarContrasena(
    @SesionActual() sesion: SesionActiva,
    @Body({ schema: cambiarContrasenaSchema }) dto: CambiarContrasenaDto,
  ): Promise<void> {
    return this.cuentas.cambiarContrasena(sesion, dto);
  }

  @Get('registros/:emisorId')
  @Roles('gobernanza')
  registro(
    @Param('emisorId', { schema: emisorIdRegistroSchema }) emisorId: string,
  ): Promise<RegistroEmisor> {
    return this.cuentas.registroPorId(emisorId);
  }
}
