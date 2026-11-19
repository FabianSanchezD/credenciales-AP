import { z } from 'zod';
import { CATEGORIAS_EMISOR, ESTADOS_EMISOR } from './emisor.entity.js';

export const emisorIdSchema = z.uuid({
  error: 'El id del emisor no es válido',
});

const nombreSchema = z.string().trim().min(2).max(200);
const sitioWebSchema = z.url({ error: 'El sitio web debe ser una URL válida' });

/** La cuenta Stellar es la de la sesión: no viaja en el cuerpo. */
export const crearEmisorSchema = z.strictObject({
  nombre: nombreSchema,
  categoria: z.enum(CATEGORIAS_EMISOR),
  sitioWeb: sitioWebSchema.nullish(),
});

export type CrearEmisorDto = z.infer<typeof crearEmisorSchema>;

export const actualizarEmisorSchema = z
  .strictObject({
    nombre: nombreSchema.optional(),
    sitioWeb: sitioWebSchema.nullable().optional(),
  })
  .refine((dto) => Object.keys(dto).length > 0, {
    error: 'Debe indicar al menos un campo a actualizar',
  });

export type ActualizarEmisorDto = z.infer<typeof actualizarEmisorSchema>;

export const filtroEstadoSchema = z.enum(ESTADOS_EMISOR).optional();

export const cambiarEstadoSchema = z.strictObject({
  estado: z.enum(ESTADOS_EMISOR),
  motivo: z
    .string()
    .trim()
    .min(3, { error: 'El motivo debe tener al menos 3 caracteres' })
    .max(500, { error: 'El motivo no puede superar 500 caracteres' }),
});

export type CambiarEstadoDto = z.infer<typeof cambiarEstadoSchema>;
