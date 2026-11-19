"use client";

import { useCavos, type CavosContextValue } from "@cavos/kit/react";
import {
  toDidStellar,
  type StellarAccountState,
  type StellarNetwork,
} from "@repo/stellar";
import { useMemo } from "react";
import { stellarNetwork } from "../lib/stellar/network";
import { useStellarAccount } from "./use-stellar-account";

export type EstadoWallet =
  | "sin_sesion"
  | "cargando"
  | "requiere_aprobacion"
  | "lista";

/** Wallet de Cavos en Stellar: firma mensajes y transacciones en el dispositivo. */
export type WalletStellarCavos = Extract<
  NonNullable<CavosContextValue["wallet"]>,
  { chain: "stellar" }
>;

export interface TitularWallet {
  estado: EstadoWallet;
  /** La wallet conectada, o `null` si aún no hay sesión de Cavos. */
  wallet: WalletStellarCavos | null;
  usuario: CavosContextValue["user"];
  address: string | null;
  did: string | null;
  network: StellarNetwork;
  cuentaStellar: StellarAccountState | null;
  cuentaStellarError: Error | null;
  actualizarCuentaStellar: () => Promise<void>;
  fondearEnTestnet: (() => Promise<void>) | null;
  tienePasskey: boolean;
  passkeySoportada: boolean;
  error: string | null;
  crearWallet: () => void;
  enviarCodigoCorreo: CavosContextValue["sendOtp"];
  verificarCodigoCorreo: CavosContextValue["verifyOtp"];
  agregarPasskey: () => Promise<void>;
  aprobarDispositivoConPasskey: () => Promise<void>;
  firmarMensaje: CavosContextValue["signMessage"];
  cerrarSesion: () => void;
}

/**
 * Digital Wallet del titular (RF-01): la crea Cavos al iniciar sesión con
 * correo o una cuenta social, sin frase semilla. Expone la cuenta Stellar, el
 * DID que el titular comparte con los emisores y su estado on-chain.
 */
export function useTitularWallet(): TitularWallet {
  const cavos = useCavos();
  const wallet = cavos.wallet?.chain === "stellar" ? cavos.wallet : null;
  const address = wallet?.address ?? null;

  const did = useMemo(
    () => (address ? toDidStellar(address, stellarNetwork.network) : null),
    [address],
  );
  const stellar = useStellarAccount(address);

  let estado: EstadoWallet = "sin_sesion";
  if (cavos.isLoading || cavos.walletStatus.isDeploying) estado = "cargando";
  else if (cavos.walletStatus.needsDeviceApproval) estado = "requiere_aprobacion";
  else if (wallet) estado = "lista";

  return {
    estado,
    wallet,
    usuario: cavos.user,
    address,
    did,
    network: stellarNetwork.network,
    /** Estado de la cuenta en Stellar. Cavos la crea en la primera transacción. */
    cuentaStellar: stellar.account,
    cuentaStellarError: stellar.error,
    actualizarCuentaStellar: stellar.refresh,
    /** Solo testnet: crea la cuenta on-chain con Friendbot. */
    fondearEnTestnet: stellar.fundOnTestnet,
    tienePasskey: cavos.walletStatus.hasPasskey,
    passkeySoportada: cavos.passkeySupported,
    error: cavos.authError,

    /** Abre el inicio de sesión de Cavos; al terminar, la wallet queda creada. */
    crearWallet: cavos.openModal,
    /** Alternativa sin modal: código de 9 caracteres enviado al correo. */
    enviarCodigoCorreo: cavos.sendOtp,
    verificarCodigoCorreo: cavos.verifyOtp,
    /** Agrega una passkey para recuperar la wallet en otro dispositivo. */
    agregarPasskey: cavos.enrollPasskeyDefault,
    /** Restaura la wallet en este dispositivo con la passkey del titular. */
    aprobarDispositivoConPasskey: cavos.approveDeviceWithPasskey,
    firmarMensaje: cavos.signMessage,
    cerrarSesion: cavos.logout,
  };
}
