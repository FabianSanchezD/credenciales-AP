import { ed25519 } from "@noble/curves/ed25519";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import {
  aBase64,
  desdeBase64,
  sha256Bytes,
  utf8,
} from "./codificacion.js";

/**
 * - `sep53`: mensajes firmados por wallets de Stellar (Freighter y otras, SEP-53).
 * - `cavos`: mensajes firmados por la Digital Wallet de Cavos.
 */
export const ESQUEMAS_FIRMA = ["sep53", "cavos"] as const;
export type EsquemaFirma = (typeof ESQUEMAS_FIRMA)[number];

const PREFIJO_SEP53 = "Stellar Signed Message:\n";
const PREFIJO_CAVOS = "Cavos Signed Message:\n";

/** Bytes exactos sobre los que se calcula la firma Ed25519 en cada esquema. */
export function bytesAFirmar(esquema: EsquemaFirma, mensaje: string): Uint8Array {
  const cuerpo = utf8(mensaje);
  if (esquema === "sep53") {
    const prefijo = utf8(PREFIJO_SEP53);
    const datos = new Uint8Array(prefijo.length + cuerpo.length);
    datos.set(prefijo);
    datos.set(cuerpo, prefijo.length);
    return sha256Bytes(datos);
  }
  const prefijo = utf8(`${PREFIJO_CAVOS}${cuerpo.length}\n`);
  const datos = new Uint8Array(prefijo.length + cuerpo.length);
  datos.set(prefijo);
  datos.set(cuerpo, prefijo.length);
  return datos;
}

export interface FirmaMensaje {
  esquema: EsquemaFirma;
  /** Cuenta `G...` cuya llave produjo la firma. */
  publicKey: string;
  /** Firma Ed25519 de 64 bytes en base64 o base64url. */
  firma: string;
}

export function verificarFirmaMensaje(
  mensaje: string,
  { esquema, publicKey, firma }: FirmaMensaje,
): boolean {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) return false;
  let firmaBytes: Uint8Array;
  try {
    firmaBytes = desdeBase64(firma);
  } catch {
    return false;
  }
  if (firmaBytes.length !== 64) return false;
  const llave = new Uint8Array(StrKey.decodeEd25519PublicKey(publicKey));
  try {
    return ed25519.verify(firmaBytes, bytesAFirmar(esquema, mensaje), llave);
  } catch {
    return false;
  }
}

/**
 * Firma SEP-53 con una semilla secreta (`S...`). Solo para las pruebas y el smoke
 * de testnet: en producción firma la wallet de la persona, nunca la API.
 */
export function firmarSep53ConSemilla(semilla: string, mensaje: string): FirmaMensaje {
  const privada = new Uint8Array(StrKey.decodeEd25519SecretSeed(semilla));
  const firma = ed25519.sign(bytesAFirmar("sep53", mensaje), privada);
  return {
    esquema: "sep53",
    publicKey: Keypair.fromSecret(semilla).publicKey(),
    firma: aBase64(firma),
  };
}
