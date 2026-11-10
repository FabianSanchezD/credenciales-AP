import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config/env.js';

/** Configuración compartida entre `main.ts` y las pruebas e2e. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
  app.enableCors({ origin: config.get('CORS_ORIGINS', { infer: true }) });
}
