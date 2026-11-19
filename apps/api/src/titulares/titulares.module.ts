import { Module } from '@nestjs/common';
import { EmisoresModule } from '../emisores/emisores.module.js';
import { TitularesController } from './titulares.controller.js';
import {
  SqliteTitularesRepository,
  TitularesRepository,
} from './titulares.repository.js';
import { TitularesService } from './titulares.service.js';

@Module({
  imports: [EmisoresModule],
  controllers: [TitularesController],
  providers: [
    TitularesService,
    { provide: TitularesRepository, useClass: SqliteTitularesRepository },
  ],
})
export class TitularesModule {}
