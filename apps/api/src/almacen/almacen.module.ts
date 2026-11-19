import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import {
  AlmacenTemporal,
  AlmacenTemporalMemoria,
  AlmacenTemporalRedis,
} from './almacen-temporal.js';

@Global()
@Module({
  providers: [
    {
      provide: AlmacenTemporal,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): AlmacenTemporal => {
        const url = config.get('REDIS_URL', { infer: true });
        if (url) return new AlmacenTemporalRedis(url);
        if (config.get('NODE_ENV', { infer: true }) === 'production') {
          new Logger('AlmacenTemporal').warn(
            'Sin REDIS_URL: las sesiones viven en memoria y se pierden al reiniciar',
          );
        }
        return new AlmacenTemporalMemoria();
      },
    },
  ],
  exports: [AlmacenTemporal],
})
export class AlmacenModule {}
