import { sha256 } from "@noble/hashes/sha2";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function utf8(texto: string): Uint8Array {
  return encoder.encode(texto);
}

export function desdeUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

const ALFABETO =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** base64url sin relleno (RFC 4648, sección 5). */
export function aBase64Url(bytes: Uint8Array): string {
  let salida = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    salida +=
      ALFABETO[(n >> 18) & 63]! +
      ALFABETO[(n >> 12) & 63]! +
      ALFABETO[(n >> 6) & 63]! +
      ALFABETO[n & 63]!;
  }
  const resto = bytes.length - i;
  if (resto === 1) {
    const n = bytes[i]! << 16;
    salida += ALFABETO[(n >> 18) & 63]! + ALFABETO[(n >> 12) & 63]!;
  } else if (resto === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    salida +=
      ALFABETO[(n >> 18) & 63]! +
      ALFABETO[(n >> 12) & 63]! +
      ALFABETO[(n >> 6) & 63]!;
  }
  return salida;
}

/** Acepta base64url y base64 estándar, con o sin relleno. */
export function desdeBase64(texto: string): Uint8Array {
  const limpio = texto.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (!/^[A-Za-z0-9_-]*$/.test(limpio) || limpio.length % 4 === 1) {
    throw new Error("Texto base64 inválido");
  }
  const bytes = new Uint8Array(Math.floor((limpio.length * 3) / 4));
  let bits = 0;
  let acumulado = 0;
  let j = 0;
  for (const caracter of limpio) {
    acumulado = (acumulado << 6) | ALFABETO.indexOf(caracter);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[j++] = (acumulado >> bits) & 0xff;
    }
  }
  return bytes;
}

export function aBase64(bytes: Uint8Array): string {
  const url = aBase64Url(bytes).replace(/-/g, "+").replace(/_/g, "/");
  return url + "=".repeat((4 - (url.length % 4)) % 4);
}

export function aHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function desdeHex(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error("Texto hex inválido");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function sha256Bytes(datos: Uint8Array | string): Uint8Array {
  return sha256(typeof datos === "string" ? utf8(datos) : datos);
}

export function sha256Hex(datos: Uint8Array | string): string {
  return aHex(sha256Bytes(datos));
}

export function bytesAleatorios(largo: number): Uint8Array {
  const bytes = new Uint8Array(largo);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function compararBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a[i]! ^ b[i]!;
  return diferencia === 0;
}
