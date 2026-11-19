import { isStellarAccountAddress, STELLAR_NETWORKS } from '@repo/stellar';
import { z } from 'zod';

export const DRIVERS_ANCLAJE = ['stellar', 'acta', 'memoria'] as const;
export type DriverAnclaje = (typeof DRIVERS_ANCLAJE)[number];

const listaSeparadaPorComas = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const booleano = z
  .enum(['true', 'false', '1', '0', ''])
  .default('false')
  .transform((value) => value === 'true' || value === '1');

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    /** Orígenes de las web apps separados por coma. */
    CORS_ORIGINS: z
      .string()
      .default(
        'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003',
      )
      .transform(listaSeparadaPorComas),
    STELLAR_NETWORK: z.enum(STELLAR_NETWORKS).default('testnet'),
    STELLAR_HORIZON_URL: z.url().optional(),
    /** Archivo SQLite; `:memory:` para pruebas. */
    DATABASE_PATH: z.string().min(1).default('./data/credenciales.db'),
    /** Si existe, desafíos y sesiones viven en Redis; si no, en memoria. */
    REDIS_URL: z.string().min(1).optional(),
    /** Cuentas Stellar de la entidad que autoriza, separadas por coma. */
    GOBERNANZA_CUENTAS: z
      .string()
      .default('')
      .transform(listaSeparadaPorComas)
      .refine((cuentas) => cuentas.every(isStellarAccountAddress), {
        error: 'GOBERNANZA_CUENTAS solo admite cuentas Stellar (G…)',
      }),
    /** Solo desarrollo: cualquier cuenta puede entrar a la consola de gobernanza. */
    GOBERNANZA_ABIERTA: booleano,
    ANCLAJE_DRIVER: z.enum(DRIVERS_ANCLAJE).default('stellar'),
    ACTA_API_KEY: z.string().min(1).optional(),
    /** Opcional: sobrescribe la URL de la API de ACTA. */
    ACTA_API_URL: z.url().optional(),
    /** Llave AES-256 de la bóveda: 64 caracteres hexadecimales. */
    BOVEDA_CLAVE: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, {
        error: 'BOVEDA_CLAVE debe tener 64 caracteres hexadecimales',
      })
      .optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.GOBERNANZA_ABIERTA) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOBERNANZA_ABIERTA'],
        message: 'GOBERNANZA_ABIERTA no se permite en producción',
      });
    }
    if (env.NODE_ENV === 'production' && !env.BOVEDA_CLAVE) {
      ctx.addIssue({
        code: 'custom',
        path: ['BOVEDA_CLAVE'],
        message: 'BOVEDA_CLAVE es obligatoria en producción',
      });
    }
    if (env.ANCLAJE_DRIVER === 'memoria' && env.NODE_ENV !== 'test') {
      ctx.addIssue({
        code: 'custom',
        path: ['ANCLAJE_DRIVER'],
        message: 'El driver memoria solo se permite con NODE_ENV=test',
      });
    }
    if (env.ANCLAJE_DRIVER === 'acta' && !env.ACTA_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ACTA_API_KEY'],
        message: 'ACTA_API_KEY es obligatoria con ANCLAJE_DRIVER=acta',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Variables de entorno inválidas:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
