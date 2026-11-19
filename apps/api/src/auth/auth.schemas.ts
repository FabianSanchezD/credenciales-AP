import { ESQUEMAS_FIRMA } from '@repo/credenciales';
import { isStellarAccountAddress } from '@repo/stellar';
import { z } from 'zod';
import { ROLES } from './sesion.js';

export const cuentaStellarSchema = z
  .string()
  .trim()
  .refine(isStellarAccountAddress, {
    error: 'Debe ser una cuenta Stellar válida (G…)',
  });

export const firmaMensajeSchema = z.strictObject({
  esquema: z.enum(ESQUEMAS_FIRMA),
  publicKey: cuentaStellarSchema,
  firma: z.string().min(1).max(200),
});

export const crearDesafioSchema = z.strictObject({
  address: cuentaStellarSchema,
  rol: z.enum(ROLES),
});

export type CrearDesafioDto = z.infer<typeof crearDesafioSchema>;

export const crearSesionSchema = z.strictObject({
  desafioId: z.uuid({ error: 'El desafío no es válido' }),
  firma: firmaMensajeSchema,
});

export type CrearSesionDto = z.infer<typeof crearSesionSchema>;
