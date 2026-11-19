import { aBase64, desdeBase64, firmarSep53ConSemilla, type FirmaMensaje } from "@repo/credenciales";
import {
  fundWithFriendbot,
  getAccountState,
  getNetworkConfig,
  type StellarNetwork,
} from "@repo/stellar";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

export type TipoFirmante = "demo" | "wallet" | "cavos";

/**
 * Quien firma en el navegador. Las llaves privadas nunca salen de aquí: la API
 * solo recibe firmas y transacciones ya firmadas (RNF-02).
 */
export interface Firmante {
  tipo: TipoFirmante;
  /** Cuenta Stellar `G...`. */
  address: string;
  /** Nombre visible, p. ej. "Freighter" o "Cuenta demo". */
  etiqueta: string;
  firmarMensaje(mensaje: string): Promise<FirmaMensaje>;
  firmarTransaccion(xdr: string, networkPassphrase: string): Promise<string>;
  desconectar?(): Promise<void>;
}

function almacenamiento(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export interface OpcionesDemo {
  /** Clave de localStorage, distinta por app y rol. */
  clave: string;
  network: StellarNetwork;
  horizonUrl?: string;
}

/**
 * Cuenta de prueba guardada en el navegador y fondeada con Friendbot. Solo para
 * testnet: permite demostrar los flujos sin extensiones ni correo.
 */
export async function crearFirmanteDemo(opciones: OpcionesDemo): Promise<Firmante> {
  if (opciones.network !== "testnet") {
    throw new Error("La cuenta demo solo existe en testnet");
  }
  const store = almacenamiento();
  let semilla = store?.getItem(opciones.clave) ?? null;
  if (!semilla) {
    semilla = Keypair.random().secret();
    store?.setItem(opciones.clave, semilla);
  }
  const keypair = Keypair.fromSecret(semilla);
  const config = getNetworkConfig("testnet", { horizonUrl: opciones.horizonUrl });
  const estado = await getAccountState(keypair.publicKey(), config);
  if (!estado.exists) await fundWithFriendbot(keypair.publicKey(), config);

  return {
    tipo: "demo",
    address: keypair.publicKey(),
    etiqueta: "Cuenta demo (testnet)",
    firmarMensaje: async (mensaje) => firmarSep53ConSemilla(semilla, mensaje),
    firmarTransaccion: async (xdr, networkPassphrase) => {
      const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
      tx.sign(keypair);
      return tx.toXDR();
    },
  };
}

export function olvidarCuentaDemo(clave: string): void {
  almacenamiento()?.removeItem(clave);
}

let kitIniciado = false;

/** Normaliza la firma que devuelven las distintas wallets a base64. */
function firmaABase64(firmado: unknown): string {
  if (typeof firmado === "string") {
    return aBase64(desdeBase64(firmado));
  }
  if (firmado instanceof Uint8Array) return aBase64(firmado);
  if (firmado && typeof firmado === "object" && "data" in firmado) {
    return aBase64(new Uint8Array((firmado as { data: number[] }).data));
  }
  throw new Error("La wallet devolvió una firma en un formato desconocido");
}

/**
 * Wallet de Stellar del emisor o de la entidad que autoriza (Freighter, xBull,
 * Albedo, Lobstr...). Abre el selector de Stellar Wallets Kit.
 */
export async function conectarWalletStellar(network: StellarNetwork): Promise<Firmante> {
  const [{ StellarWalletsKit }, { defaultModules }, tipos] = await Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
    import("@creit.tech/stellar-wallets-kit/types"),
  ]);
  const passphrase =
    network === "testnet" ? tipos.Networks.TESTNET : tipos.Networks.PUBLIC;
  if (!kitIniciado) {
    StellarWalletsKit.init({ modules: defaultModules(), network: passphrase });
    kitIniciado = true;
  }
  const { address } = await StellarWalletsKit.authModal();

  return {
    tipo: "wallet",
    address,
    etiqueta: "Wallet de Stellar",
    firmarMensaje: async (mensaje) => {
      const { signedMessage } = await StellarWalletsKit.signMessage(mensaje, {
        address,
        networkPassphrase: passphrase,
      });
      return { esquema: "sep53", publicKey: address, firma: firmaABase64(signedMessage) };
    },
    firmarTransaccion: async (xdr, networkPassphrase) => {
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
        address,
        networkPassphrase,
      });
      return signedTxXdr;
    },
    desconectar: () => StellarWalletsKit.disconnect(),
  };
}
