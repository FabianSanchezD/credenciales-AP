import { Module } from '@nestjs/common';
import { EmisoresModule } from '../emisores/emisores.module.js';
import { VerificacionController } from './verificacion.controller.js';
import { VerificacionService } from './verificacion.service.js';

@Module({
  imports: [EmisoresModule],
  controllers: [VerificacionController],
  providers: [VerificacionService],
})
export class VerificacionModule {}
