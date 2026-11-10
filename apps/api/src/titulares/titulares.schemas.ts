import { isDidStellar } from '@repo/stellar';
import { z } from 'zod';

export const titularIdSchema = z.uuid({ error: 'El id del titular no es válido' });

export const registrarTitularSchema = z.strictObject({
  did: z.string().trim().refine(isDidStellar, {
    error: 'Debe ser un DID did:stellar:<red>:<cuenta G…>',
  }),
});

export type RegistrarTitularDto = z.infer<typeof registrarTitularSchema>;
