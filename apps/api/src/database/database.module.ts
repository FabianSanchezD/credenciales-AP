import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { BaseDatosService } from './base-datos.service.js';

@Global()
@Module({
  providers: [
    {
      provide: BaseDatosService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new BaseDatosService(config.get('DATABASE_PATH', { infer: true })),
    },
  ],
  exports: [BaseDatosService],
})
export class DatabaseModule {}
