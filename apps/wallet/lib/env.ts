import { isStellarNetwork, type StellarNetwork } from "@repo/stellar";

/**
 * Variables públicas de la wallet. Next.js solo las incrusta en el bundle del
 * navegador si se leen como `process.env.NEXT_PUBLIC_*` literales.
 */
const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";

if (!isStellarNetwork(network)) {
  throw new Error(
    `NEXT_PUBLIC_STELLAR_NETWORK debe ser "testnet" o "mainnet", no "${network}"`,
  );
}

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  verificadorUrl: process.env.NEXT_PUBLIC_VERIFICADOR_URL ?? "http://localhost:3002",
  cavosAppId: process.env.NEXT_PUBLIC_CAVOS_APP_ID,
  /** Nunca cambiarlo en producción: es la sal de la llave de cada titular. */
  cavosAppSalt:
    process.env.NEXT_PUBLIC_CAVOS_APP_SALT ?? "credenciales-ap-wallet",
  stellarNetwork: network as StellarNetwork,
  stellarHorizonUrl: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
} as const;
