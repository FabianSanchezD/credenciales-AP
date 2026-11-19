"use client";

import { conectarWalletStellar, crearFirmanteDemo, type Firmante } from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { abreviar } from "@repo/ui";
import { useCallback } from "react";
import { env } from "./env";

export const CLAVE_DEMO = "credenciales-ap:demo:emisor";

function hayCuentaDemo(): boolean {
  try {
    return Boolean(window.localStorage.getItem(CLAVE_DEMO));
  } catch {
    return false;
  }
}

/**
 * Devuelve el firmante de la cuenta en sesión. Tras recargar la página la
 * sesión sigue abierta pero el firmante se pierde: la cuenta demo se recrea
 * sin preguntar (misma llave) y una wallet se vuelve a conectar.
 */
export function useFirmante() {
  const { firmante, sesion, establecerFirmante } = useSesion();
  const address = sesion?.address ?? null;

  const obtenerFirmante = useCallback(async (): Promise<Firmante> => {
    if (!address) throw new Error("Tu sesión terminó. Vuelve a iniciar sesión para firmar.");
    if (firmante && firmante.address === address) return firmante;

    if (env.stellarNetwork === "testnet" && hayCuentaDemo()) {
      const demo = await crearFirmanteDemo({
        clave: CLAVE_DEMO,
        network: env.stellarNetwork,
        horizonUrl: env.stellarHorizonUrl,
      });
      if (demo.address === address) {
        establecerFirmante(demo);
        return demo;
      }
    }

    const wallet = await conectarWalletStellar(env.stellarNetwork);
    if (wallet.address !== address) {
      await wallet.desconectar?.().catch(() => undefined);
      throw new Error(
        `La wallet conectada usa la cuenta ${abreviar(wallet.address)}, pero la sesión es de ${abreviar(address)}. ` +
          "Elige en tu wallet la cuenta de la institución, o sal y vuelve a entrar con la cuenta correcta.",
      );
    }
    establecerFirmante(wallet);
    return wallet;
  }, [address, firmante, establecerFirmante]);

  return { firmante, obtenerFirmante };
}
