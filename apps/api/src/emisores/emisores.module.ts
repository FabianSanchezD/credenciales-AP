import { Module } from '@nestjs/common';
import { EmisoresController } from './emisores.controller.js';
import {
  EmisoresRepository,
  InMemoryEmisoresRepository,
} from './emisores.repository.js';
import { EmisoresService } from './emisores.service.js';

@Module({
  controllers: [EmisoresController],
  providers: [
    EmisoresService,
    { provide: EmisoresRepository, useClass: InMemoryEmisoresRepository },
  ],
  exports: [EmisoresService],
})
export class EmisoresModule {}
