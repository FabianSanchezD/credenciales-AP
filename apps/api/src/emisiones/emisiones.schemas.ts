import { identificacionSchema } from '@repo/credenciales';
import { z } from 'zod';
import { firmaMensajeSchema } from '../auth/auth.schemas.js';

export const emisionIdSchema = z.uuid({
  error: 'El id de la emisión no es válido',
});

export const prepararEmisionSchema = z.strictObject({
  plantillaId: z.uuid({ error: 'El id de la plantilla no es válido' }),
  titularDid: z.string().trim().min(1).max(200),
  titularNombre: z
    .string()
    .trim()
    .min(2, { error: 'Escribe el nombre completo del titular' })
    .max(200, { error: 'El nombre no puede superar 200 caracteres' }),
  identificacion: identificacionSchema.optional(),
  calificacion: z.string().trim().min(1).max(100).optional(),
});
export type PrepararEmisionDto = z.infer<typeof prepararEmisionSchema>;

export const firmarEmisionSchema = z.strictObject({
  firma: firmaMensajeSchema,
});
export type FirmarEmisionDto = z.infer<typeof firmarEmisionSchema>;

export const enviarTransaccionSchema = z.strictObject({
  signedXdr: z.string().trim().min(1).max(100_000),
});
export type EnviarTransaccionDto = z.infer<typeof enviarTransaccionSchema>;

export const revocarSchema = z.strictObject({
  motivo: z
    .string()
    .trim()
    .min(3, { error: 'El motivo debe tener al menos 3 caracteres' })
    .max(500, { error: 'El motivo no puede superar 500 caracteres' }),
});
export type RevocarDto = z.infer<typeof revocarSchema>;
