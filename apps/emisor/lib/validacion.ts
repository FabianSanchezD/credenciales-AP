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
    return "Escribe la dirección completa, empezando con https://";
  }
}

/** Devuelve el error del DID, o `null` si es un did:stellar válido. */
export function validarDid(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return "Pega el DID del titular.";
  const did = parseDidStellar(texto);
  if (!did) {
    return "Ese DID no es válido. Debe verse así: did:stellar:testnet:G seguido de 55 caracteres.";
  }
  if (did.network !== env.stellarNetwork) {
    return `Ese DID es de la red ${did.network} y este portal usa ${env.stellarNetwork}. Pide al titular el DID de su Digital Wallet en ${env.stellarNetwork}.`;
  }
  return null;
}
