import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Base en memoria, anclaje simulado y consola de gobernanza abierta.
    env: {
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
      ANCLAJE_DRIVER: 'memoria',
      GOBERNANZA_ABIERTA: 'true',
      BOVEDA_CLAVE: '0123456789abcdef'.repeat(4),
    },
  },
});
