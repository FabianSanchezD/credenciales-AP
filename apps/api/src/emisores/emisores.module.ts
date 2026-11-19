import { Module } from '@nestjs/common';
import { EmisoresController } from './emisores.controller.js';
import {
  EmisoresRepository,
  SqliteEmisoresRepository,
} from './emisores.repository.js';
import { EmisoresService } from './emisores.service.js';

@Module({
  controllers: [EmisoresController],
  providers: [
    EmisoresService,
    { provide: EmisoresRepository, useClass: SqliteEmisoresRepository },
  ],
  exports: [EmisoresService],
})
export class EmisoresModule {}
