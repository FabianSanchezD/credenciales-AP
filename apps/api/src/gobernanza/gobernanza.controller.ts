import { Controller, Get } from '@nestjs/common';
import type { ResumenGobernanza } from '@repo/cliente';
import { Roles } from '../auth/decoradores.js';
import { GobernanzaService } from './gobernanza.service.js';

@Controller('gobernanza')
@Roles('gobernanza')
export class GobernanzaController {
  constructor(private readonly gobernanza: GobernanzaService) {}

  @Get('resumen')
  resumen(): ResumenGobernanza {
    return this.gobernanza.resumen();
  }
}
