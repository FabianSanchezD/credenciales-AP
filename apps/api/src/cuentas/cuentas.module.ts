import { Module } from '@nestjs/common';
import { EmisoresModule } from '../emisores/emisores.module.js';
import { CuentasController } from './cuentas.controller.js';
import {
  CuentasRepository,
  SqliteCuentasRepository,
} from './cuentas.repository.js';
import { CuentasService } from './cuentas.service.js';

@Module({
  imports: [EmisoresModule],
  controllers: [CuentasController],
  providers: [
    CuentasService,
    { provide: CuentasRepository, useClass: SqliteCuentasRepository },
  ],
})
export class CuentasModule {}
