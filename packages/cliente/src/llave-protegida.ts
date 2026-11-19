import { firmarSep53ConSemilla } from "@repo/credenciales";
import { fundWithFriendbot, getAccountState, getNetworkConfig, type StellarNetwork } from "@repo/stellar";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Firmante } from "./firmantes.js";

/**
 * Cuenta de firma de una institución creada en segundo plano al crear su
 * cuenta: la persona no ve ninguna wallet. La semilla se genera en el
 * navegador y solo viaja cifrada con la contraseña (PBKDF2 + AES-GCM), así que
 * la API guarda algo que no puede usar.
 *
 * Es el respaldo mientras no esté configurado Cavos, que hará lo mismo
 * (cuenta sin frase semilla creada por detrás) con su propia infraestructura.
 */

const ITERACIONES = 310_000;
const VERSION = "v1";

const texto = new TextEncoder();

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arreglo = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = "";
  for (const b of arreglo) binario += String.fromCharCode(b);
  return btoa(binario);
}

function desdeB64(valor: string): Uint8Array<ArrayBuffer> {
  const binario = atob(valor);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function derivarClave(contrasena: string, sal: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", texto.encode(contrasena.normalize("NFKC")), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: ITERACIONES, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** `v1.sal.iv.cifrado`, todo en base64. */
export async function cifrarSemilla(semilla: string, contrasena: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await derivarClave(contrasena, sal);
  const cifrado = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clave, texto.encode(semilla));
  return [VERSION, b64(sal), b64(iv), b64(cifrado)].join(".");
}

export async function descifrarSemilla(paquete: string, contrasena: string): Promise<string> {
  const [version, sal, iv, cifrado] = paquete.split(".");
  if (version !== VERSION || !sal || !iv || !cifrado) throw new Error("La llave guardada tiene un formato desconocido");
  const clave = await derivarClave(contrasena, desdeB64(sal));
  try {
    const plano = await crypto.subtle.decrypt({ name: "AES-GCM", iv: desdeB64(iv) }, clave, desdeB64(cifrado));
    return new TextDecoder().decode(plano);
  } catch {
    throw new Error("La contraseña no es correcta.");
  }
}

export function crearFirmanteConSemilla(semilla: string): Firmante {
  const keypair = Keypair.fromSecret(semilla);
  return {
    tipo: "llave",
    address: keypair.publicKey(),
    etiqueta: "Cuenta de la institución",
    firmarMensaje: async (mensaje) => firmarSep53ConSemilla(semilla, mensaje),
    firmarTransaccion: async (xdr, networkPassphrase) => {
      const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
      tx.sign(keypair);
      return tx.toXDR();
    },
  };
}

/**
 * Crea la cuenta de firma: genera la llave y, en testnet, la fondea con
 * Friendbot. En mainnet la cuenta debe crearla y fondearla Cavos.
 */
export async function crearCuentaDeFirma(opciones: {
  network: StellarNetwork;
  horizonUrl?: string;
  contrasena: string;
}): Promise<{ firmante: Firmante; llaveCifrada: string }> {
  if (opciones.network !== "testnet") {
    throw new Error("En mainnet la cuenta de firma la crea Cavos, que todavía no está configurado.");
  }
  const semilla = Keypair.random().secret();
  const firmante = crearFirmanteConSemilla(semilla);
  const config = getNetworkConfig(opciones.network, { horizonUrl: opciones.horizonUrl });
  const estado = await getAccountState(firmante.address, config);
  if (!estado.exists) await fundWithFriendbot(firmante.address, config);
  return { firmante, llaveCifrada: await cifrarSemilla(semilla, opciones.contrasena) };
}
