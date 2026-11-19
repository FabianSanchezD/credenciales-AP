import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Almacén de datos operativos con vencimiento (desafíos y sesiones). Nunca
 * guarda datos personales (Tabla 7).
 */
export abstract class AlmacenTemporal {
  abstract get(clave: string): Promise<string | null>;
  abstract set(
    clave: string,
    valor: string,
    ttlSegundos: number,
  ): Promise<void>;
  abstract delete(clave: string): Promise<void>;
}

/** Implementación por defecto: un solo proceso, se pierde al reiniciar. */
export class AlmacenTemporalMemoria extends AlmacenTemporal {
  private readonly datos = new Map<string, { valor: string; vence: number }>();

  async get(clave: string): Promise<string | null> {
    const entrada = this.datos.get(clave);
    if (!entrada) return null;
    if (entrada.vence <= Date.now()) {
      this.datos.delete(clave);
      return null;
    }
    return entrada.valor;
  }

  async set(clave: string, valor: string, ttlSegundos: number): Promise<void> {
    this.limpiarVencidos();
    this.datos.set(clave, { valor, vence: Date.now() + ttlSegundos * 1000 });
  }

  async delete(clave: string): Promise<void> {
    this.datos.delete(clave);
  }

  private limpiarVencidos(): void {
    const ahora = Date.now();
    for (const [clave, entrada] of this.datos) {
      if (entrada.vence <= ahora) this.datos.delete(clave);
    }
  }
}

/** Implementación con Redis, activa cuando existe `REDIS_URL`. */
export class AlmacenTemporalRedis
  extends AlmacenTemporal
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(AlmacenTemporalRedis.name);
  private readonly redis: Redis;

  constructor(url: string) {
    super();
    this.redis = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
    this.redis.on('error', (error: Error) =>
      this.logger.error(`Error de conexión con Redis: ${error.message}`),
    );
  }

  get(clave: string): Promise<string | null> {
    return this.redis.get(clave);
  }

  async set(clave: string, valor: string, ttlSegundos: number): Promise<void> {
    await this.redis.set(clave, valor, 'EX', ttlSegundos);
  }

  async delete(clave: string): Promise<void> {
    await this.redis.del(clave);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
