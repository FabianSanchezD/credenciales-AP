import type { CavosConfig, CavosModalConfig } from "@cavos/kit/react";
import { env } from "../env";

/**
 * La Digital Wallet del titular es una cuenta Stellar clásica (`G…`) creada
 * por Cavos: no custodial, sin frase semilla y con transacciones patrocinadas.
 * La cuenta se crea on-chain de forma diferida, en la primera transacción.
 */
export const cavosConfig: CavosConfig = {
  appId: env.cavosAppId,
  chains: ["stellar"],
  defaultChain: "stellar",
  network: env.stellarNetwork,
  appSalt: env.cavosAppSalt,
  // Un dispositivo nuevo recupera la wallet con la passkey del titular.
  deviceApproval: "passkey",
};

/** Modal de inicio de sesión que provee Cavos (no es UI propia). */
export const cavosModalConfig: CavosModalConfig = {
  appName: "Digital Wallet",
  providers: ["email", "google", "apple"],
};
