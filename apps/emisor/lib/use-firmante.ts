"use client";

import {
  conectarWalletStellar,
  crearFirmanteConSemilla,
  crearFirmanteDemo,
  descifrarSemilla,
  ErrorApi,
  type Firmante,
} from "@repo/cliente";
import { useSesion } from "@repo/cliente/react";
import { abreviar } from "@repo/ui";
import { useCallback, useRef } from "react";
import { env } from "./env";
import { usePedirContrasena } from "./firma-contrasena";

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
 * sesión sigue abierta pero el firmante se pierde:
 * - cuentas con correo: se pide la contraseña para abrir la llave guardada;
 * - cuenta demo: se recrea sin preguntar (misma llave);
 * - wallet: se vuelve a conectar.
 */
export function useFirmante() {
  const { api, firmante, sesion, establecerFirmante } = useSesion();
  const pedirContrasena = usePedirContrasena();
  // Una emisión firma dos veces seguidas: el estado aún no refleja el firmante
  // recién abierto, así que también se guarda aquí para no pedir la contraseña dos veces.
  const reciente = useRef<Firmante | null>(null);
  const address = sesion?.address ?? null;

  const obtenerFirmante = useCallback(async (): Promise<Firmante> => {
    if (!address) throw new Error("Su sesión terminó. Vuelva a iniciar sesión para firmar.");
    if (firmante && firmante.address === address) return firmante;
    if (reciente.current?.address === address) return reciente.current;

    const llave = await api.miLlave().catch((e: unknown) => {
      if (e instanceof ErrorApi && e.status === 404) return null;
      throw e;
    });
    if (llave) {
      const contrasena = await pedirContrasena();
      const conLlave = crearFirmanteConSemilla(await descifrarSemilla(llave.llaveCifrada, contrasena));
      if (conLlave.address !== address) throw new Error("La llave guardada no corresponde a la cuenta en sesión.");
      reciente.current = conLlave;
      establecerFirmante(conLlave);
      return conLlave;
    }

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
  }, [api, address, firmante, establecerFirmante, pedirContrasena]);

  return { firmante, obtenerFirmante };
}
