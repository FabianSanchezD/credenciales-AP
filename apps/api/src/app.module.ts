import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.js';
import { EmisoresModule } from './emisores/emisores.module.js';
import { HealthController } from './health/health.controller.js';
import { StellarModule } from './stellar/stellar.module.js';
import { TitularesModule } from './titulares/titulares.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    StellarModule,
    EmisoresModule,
    TitularesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
