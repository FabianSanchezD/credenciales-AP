import { Module } from '@nestjs/common';
import { EmisoresModule } from '../emisores/emisores.module.js';
import { BovedaController } from './boveda.controller.js';
import {
  BovedaRepository,
  SqliteBovedaRepository,
} from './boveda.repository.js';
import { BovedaService } from './boveda.service.js';
import { CifradoService } from './cifrado.service.js';

@Module({
  imports: [EmisoresModule],
  controllers: [BovedaController],
  providers: [
    BovedaService,
    CifradoService,
    { provide: BovedaRepository, useClass: SqliteBovedaRepository },
  ],
  exports: [BovedaService, CifradoService],
})
export class BovedaModule {}
