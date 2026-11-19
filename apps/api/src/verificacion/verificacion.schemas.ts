import { z } from 'zod';

/** `{ presentacion }` (objeto) o `{ codigo }` (texto del QR o enlace). */
export const verificarSchema = z.union(
  [
    z.strictObject({ presentacion: z.record(z.string(), z.unknown()) }),
    z.strictObject({ codigo: z.string().trim().min(1).max(50_000) }),
  ],
  { error: 'Envía la presentación o el código que compartió el titular' },
);

export type VerificarDto = z.infer<typeof verificarSchema>;
