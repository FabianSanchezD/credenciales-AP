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
