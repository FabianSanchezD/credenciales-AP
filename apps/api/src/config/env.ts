import { STELLAR_NETWORKS } from '@repo/stellar';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  /** Orígenes de las web apps separados por coma. */
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003',
    )
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  STELLAR_NETWORK: z.enum(STELLAR_NETWORKS).default('testnet'),
  STELLAR_HORIZON_URL: z.url().optional(),
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
