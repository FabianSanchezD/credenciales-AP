import { z } from 'zod';
import { firmaMensajeSchema } from '../auth/auth.schemas.js';
import {
  CATEGORIAS_REGISTRO,
  DOMINIOS_CORREO_PERSONAL,
  FORMATOS_ID,
  PROVINCIAS,
  TIPOS_ID_INSTITUCION,
  TIPOS_ID_PERSONA,
  type TipoIdentificacion,
} from './cuenta.entity.js';

const correoSchema = z
  .email({ error: 'Escribe un correo válido' })
  .trim()
  .toLowerCase()
  .max(200);

export const correoInstitucionalSchema = correoSchema.refine(
  (correo) => !DOMINIOS_CORREO_PERSONAL.includes(correo.split('@')[1] ?? ''),
  { error: 'Usa el correo institucional, no uno personal' },
);

/** 10 caracteres o más, con una mayúscula, un número y un símbolo. */
export const contrasenaSchema = z
  .string()
  .min(10, { error: 'La contraseña debe tener al menos 10 caracteres' })
  .max(200)
  .refine((v) => /[A-ZÁÉÍÓÚÑ]/.test(v), {
    error: 'La contraseña necesita una mayúscula',
  })
  .refine((v) => /\d/.test(v), { error: 'La contraseña necesita un número' })
  .refine((v) => /[^\p{L}\p{N}\s]/u.test(v), {
    error: 'La contraseña necesita un símbolo',
  });

const texto = (min: number, max = 200) => z.string().trim().min(min).max(max);

function identificacionValida(
  datos: { tipoIdentificacion: TipoIdentificacion; identificacion: string },
  ctx: z.RefinementCtx,
): void {
  if (!FORMATOS_ID[datos.tipoIdentificacion].test(datos.identificacion)) {
    ctx.addIssue({
      code: 'custom',
      path: ['identificacion'],
      message: 'La identificación no tiene el formato esperado',
    });
  }
}

const institucionBase = z.strictObject({
  nombre: texto(5),
  categoria: z.enum(CATEGORIAS_REGISTRO),
  tipoIdentificacion: z.enum(TIPOS_ID_INSTITUCION),
  identificacion: texto(5, 30),
  correo: correoInstitucionalSchema,
  sitioWeb: z.url({ error: 'El sitio web debe ser una URL válida' }),
  provincia: z.enum(PROVINCIAS),
});

export const institucionSchema =
  institucionBase.superRefine(identificacionValida);

/** Al corregir la solicitud el correo no cambia: es el usuario de la cuenta. */
export const institucionCorreccionSchema = institucionBase
  .omit({ correo: true })
  .superRefine(identificacionValida);

export const representanteSchema = z
  .strictObject({
    nombre: texto(3).refine((v) => v.split(/\s+/).length >= 2, {
      error: 'Escribe el nombre y al menos un apellido',
    }),
    tipoIdentificacion: z.enum(TIPOS_ID_PERSONA),
    identificacion: texto(5, 30),
    cargo: texto(3),
    correo: correoSchema,
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{8,20}$/, { error: 'Escribe un teléfono válido' }),
  })
  .superRefine(identificacionValida);

export const enviarCodigoSchema = z.strictObject({
  correo: correoInstitucionalSchema,
});
export type EnviarCodigoDto = z.infer<typeof enviarCodigoSchema>;

export const verificarCodigoSchema = z.strictObject({
  correo: correoInstitucionalSchema,
  codigo: z.string().regex(/^\d{6}$/, { error: 'El código tiene 6 dígitos' }),
});
export type VerificarCodigoDto = z.infer<typeof verificarCodigoSchema>;

export const crearCuentaSchema = z.strictObject({
  institucion: institucionSchema,
  representante: representanteSchema,
  contrasena: contrasenaSchema,
  verificacionId: z.string().min(16).max(100),
  desafioId: z.uuid({ error: 'El desafío no es válido' }),
  firma: firmaMensajeSchema,
  /** `v1.sal.iv.cifrado` (base64): solo el navegador la descifra. */
  llaveCifrada: z
    .string()
    .regex(/^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/, {
      error: 'La llave cifrada no tiene el formato esperado',
    })
    .max(1000),
});
export type CrearCuentaDto = z.infer<typeof crearCuentaSchema>;

export const ingresarSchema = z.strictObject({
  correo: correoSchema,
  contrasena: z.string().min(1).max(200),
});
export type IngresarDto = z.infer<typeof ingresarSchema>;

export const corregirRegistroSchema = z.strictObject({
  institucion: institucionCorreccionSchema,
  representante: representanteSchema,
});
export type CorregirRegistroDto = z.infer<typeof corregirRegistroSchema>;

export const emisorIdRegistroSchema = z.uuid({
  error: 'El id del emisor no es válido',
});
