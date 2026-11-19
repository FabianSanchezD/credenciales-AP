import { Module } from '@nestjs/common';
import { GobernanzaController } from './gobernanza.controller.js';
import { GobernanzaService } from './gobernanza.service.js';

@Module({
  controllers: [GobernanzaController],
  providers: [GobernanzaService],
})
export class GobernanzaModule {}
