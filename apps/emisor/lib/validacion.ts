import { DOMINIOS_CORREO_PERSONAL, FORMATOS_ID, type TipoIdentificacion } from "@repo/cliente";
import { parseDidStellar } from "@repo/stellar";
import { env } from "./env";

/** Devuelve el error del sitio web, o `null` si está vacío o es válido. */
export function validarSitioWeb(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  try {
    const url = new URL(texto);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return null;
  } catch {
    return "Escriba la dirección completa, empezando con https://";
  }
}

/** Devuelve el error del DID, o `null` si es un did:stellar válido. */
export function validarDid(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return "Pegue el DID del titular.";
  const did = parseDidStellar(texto);
  if (!did) {
    return "No es un DID válido. Debe verse así: did:stellar:testnet:G seguido de 55 caracteres.";
  }
  if (did.network !== env.stellarNetwork) {
    return `Ese DID es de la red ${did.network} y este portal usa ${env.stellarNetwork}. Pida al titular el DID de su Digital Wallet en ${env.stellarNetwork}.`;
  }
  return null;
}

/** Error del correo, o `null`. `institucional` rechaza proveedores personales. */
export function validarCorreo(valor: string, institucional = false): string | null {
  const texto = valor.trim().toLowerCase();
  if (!texto) return "Escriba el correo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto)) return "Escriba un correo válido, como nombre@institucion.ac.cr";
  const dominio = texto.split("@")[1] ?? "";
  if (institucional && (DOMINIOS_CORREO_PERSONAL as readonly string[]).includes(dominio)) {
    return "Use el correo institucional, no uno personal.";
  }
  return null;
}

export function validarIdentificacion(tipo: TipoIdentificacion, valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return "Escriba la identificación.";
  const { patron, ejemplo } = FORMATOS_ID[tipo];
  return patron.test(texto) ? null : `El formato esperado es ${ejemplo}.`;
}

/** Reglas de la contraseña con su estado, para mostrarlas en vivo. */
export function reglasContrasena(valor: string) {
  return [
    { regla: "10 caracteres o más", cumple: valor.length >= 10 },
    { regla: "Una mayúscula", cumple: /[A-ZÁÉÍÓÚÑ]/.test(valor) },
    { regla: "Un número", cumple: /\d/.test(valor) },
    { regla: "Un símbolo", cumple: /[^\p{L}\p{N}\s]/u.test(valor) },
  ];
}
