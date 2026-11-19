import { contenidoPlantillaSchema } from '@repo/credenciales';
import { z } from 'zod';

export const plantillaIdSchema = z.uuid({
  error: 'El id de la plantilla no es válido',
});

/**
 * Salvaguarda S1: los resultados de aprendizaje y el contexto formativo son
 * obligatorios. El esquema compartido lo exige.
 */
export const plantillaSchema = contenidoPlantillaSchema;

/** `Grado/Ingenierías`: segmentos sin barras sueltas ni espacios extremos. */
export const rutaCarpetaSchema = z
  .string()
  .trim()
  .min(1, { error: 'Escriba un nombre.' })
  .max(200)
  .refine(
    (ruta) => ruta.split('/').every((p) => p.trim() === p && p.length > 0),
    { error: 'La carpeta no es válida' },
  );

export const organizacionSchema = z.strictObject({
  carpeta: rutaCarpetaSchema.nullable(),
  etiquetas: z
    .array(z.string().trim().min(1).max(40))
    .max(20)
    .transform((t) => [...new Set(t)]),
});
export type OrganizacionDto = z.infer<typeof organizacionSchema>;

export const carpetaSchema = z.strictObject({ ruta: rutaCarpetaSchema });
export const renombrarCarpetaSchema = z.strictObject({
  de: rutaCarpetaSchema,
  a: rutaCarpetaSchema,
});
