"use client";

import { useSesion } from "@repo/cliente/react";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useTitularWallet, type TitularWallet } from "../hooks/use-titular-wallet";
import { crearFirmanteCavos, guardarMetodo } from "../lib/firmantes";

interface ContextoTitular {
  /** Estado de la Digital Wallet de Cavos en este dispositivo. */
  cavos: TitularWallet;
  /** Cierra la sesión de la API y la de Cavos. */
  salir: () => Promise<void>;
}

const Contexto = createContext<ContextoTitular | null>(null);

/**
 * Une la wallet de Cavos con la sesión de la API. Al recargar la página la
 * sesión sigue guardada, y cuando Cavos restaura la wallet de la misma cuenta
 * se vuelve a asociar como firmante sin pedir otra firma.
 */
export function TitularProvider({ children }: { children: ReactNode }) {
  const cavos = useTitularWallet();
  const { estado, sesion, firmante, establecerFirmante, cerrarSesion } = useSesion();
  const { wallet, cerrarSesion: cerrarCavos, estado: estadoCavos } = cavos;

  useEffect(() => {
    if (estado !== "activa" || !sesion || firmante || !wallet) return;
    if (wallet.address !== sesion.address) return;
    establecerFirmante(crearFirmanteCavos(wallet));
  }, [estado, sesion, firmante, wallet, establecerFirmante]);

  const salir = useCallback(async () => {
    await cerrarSesion();
    guardarMetodo(null);
    if (estadoCavos !== "sin_sesion") cerrarCavos();
  }, [cerrarSesion, cerrarCavos, estadoCavos]);

  const valor = useMemo(() => ({ cavos, salir }), [cavos, salir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTitular(): ContextoTitular {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useTitular debe usarse dentro de <TitularProvider>");
  return contexto;
}
