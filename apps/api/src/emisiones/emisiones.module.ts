import { Module } from '@nestjs/common';
import { BovedaModule } from '../boveda/boveda.module.js';
import { EmisoresModule } from '../emisores/emisores.module.js';
import { PlantillasModule } from '../plantillas/plantillas.module.js';
import { EmisionesController } from './emisiones.controller.js';
import {
  EmisionesRepository,
  SqliteEmisionesRepository,
} from './emisiones.repository.js';
import { EmisionesService } from './emisiones.service.js';

@Module({
  imports: [EmisoresModule, PlantillasModule, BovedaModule],
  controllers: [EmisionesController],
  providers: [
    EmisionesService,
    { provide: EmisionesRepository, useClass: SqliteEmisionesRepository },
  ],
})
export class EmisionesModule {}
