import { isStellarAccountAddress } from '@repo/stellar';
import { z } from 'zod';
import { CATEGORIAS_EMISOR } from './emisor.entity.js';

export const emisorIdSchema = z.uuid({ error: 'El id del emisor no es válido' });

export const crearEmisorSchema = z.strictObject({
  nombre: z.string().trim().min(2).max(200),
  categoria: z.enum(CATEGORIAS_EMISOR),
  sitioWeb: z.url().nullish(),
  stellarAddress: z.string().trim().refine(isStellarAccountAddress, {
    error: 'Debe ser una cuenta Stellar válida (G…)',
  }),
});

export type CrearEmisorDto = z.infer<typeof crearEmisorSchema>;

export const actualizarEmisorSchema = crearEmisorSchema
  .omit({ stellarAddress: true })
  .partial()
  .refine((dto) => Object.keys(dto).length > 0, {
    error: 'Debe indicar al menos un campo a actualizar',
  });

export type ActualizarEmisorDto = z.infer<typeof actualizarEmisorSchema>;
