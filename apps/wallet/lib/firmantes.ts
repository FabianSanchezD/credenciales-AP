import type { Firmante, TipoFirmante } from "@repo/cliente";
import { aBase64 } from "@repo/credenciales";
import type { WalletStellarCavos } from "../hooks/use-titular-wallet";

const CLAVE_METODO = "credenciales-ap:wallet:metodo";

/**
 * Firmante del titular a partir de su Digital Wallet de Cavos. La llave vive
 * en el dispositivo: la API solo recibe la firma (RNF-02).
 */
export function crearFirmanteCavos(wallet: WalletStellarCavos): Firmante {
  return {
    tipo: "cavos",
    address: wallet.address,
    etiqueta: "Digital Wallet de Cavos",
    firmarMensaje: async (mensaje) => {
      const firma = await wallet.signMessage(mensaje);
      return { esquema: "cavos", publicKey: firma.publicKey, firma: aBase64(firma.signature) };
    },
    firmarTransaccion: (xdr) => wallet.signXdr(xdr),
  };
}

/** Recuerda cómo entró el titular, para mostrarlo en su cuenta tras recargar. */
export function guardarMetodo(tipo: TipoFirmante | null): void {
  try {
    if (tipo) window.localStorage.setItem(CLAVE_METODO, tipo);
    else window.localStorage.removeItem(CLAVE_METODO);
  } catch {
    // Sin almacenamiento solo se pierde la etiqueta del método.
  }
}

export function leerMetodo(): TipoFirmante | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_METODO);
    return valor === "cavos" || valor === "wallet" ? valor : null;
  } catch {
    return null;
  }
}
