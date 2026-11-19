import { Module } from '@nestjs/common';
import { EmisoresModule } from '../emisores/emisores.module.js';
import { PlantillasController } from './plantillas.controller.js';
import {
  PlantillasRepository,
  SqlitePlantillasRepository,
} from './plantillas.repository.js';
import { PlantillasService } from './plantillas.service.js';

@Module({
  imports: [EmisoresModule],
  controllers: [PlantillasController],
  providers: [
    PlantillasService,
    { provide: PlantillasRepository, useClass: SqlitePlantillasRepository },
  ],
  exports: [PlantillasService],
})
export class PlantillasModule {}
