import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AlmacenModule } from './almacen/almacen.module.js';
import { AnclajeModule } from './anclaje/anclaje.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BovedaModule } from './boveda/boveda.module.js';
import { CuentasModule } from './cuentas/cuentas.module.js';
import { ConfigController } from './config/config.controller.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { EmisionesModule } from './emisiones/emisiones.module.js';
import { EmisoresModule } from './emisores/emisores.module.js';
import { GobernanzaModule } from './gobernanza/gobernanza.module.js';
import { HealthController } from './health/health.controller.js';
import { PlantillasModule } from './plantillas/plantillas.module.js';
import { StellarModule } from './stellar/stellar.module.js';
import { TitularesModule } from './titulares/titulares.module.js';
import { VerificacionModule } from './verificacion/verificacion.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límites por IP; se aplican con `ThrottlerGuard` en /auth y /verificaciones.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
      errorMessage:
        'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    }),
    DatabaseModule,
    AlmacenModule,
    StellarModule,
    AnclajeModule,
    AuthModule,
    EmisoresModule,
    CuentasModule,
    TitularesModule,
    PlantillasModule,
    BovedaModule,
    EmisionesModule,
    VerificacionModule,
    GobernanzaModule,
  ],
  controllers: [HealthController, ConfigController],
})
export class AppModule {}
