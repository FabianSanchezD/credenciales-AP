import { getNetworkConfig, isStellarNetwork, type StellarNetwork } from "@repo/stellar";

/**
 * Variables públicas. Next.js solo las incrusta en el navegador si se leen
 * como `process.env.NEXT_PUBLIC_*` literales.
 */
const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";

if (!isStellarNetwork(network)) {
  throw new Error(`NEXT_PUBLIC_STELLAR_NETWORK debe ser "testnet" o "mainnet", no "${network}"`);
}

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  stellarNetwork: network as StellarNetwork,
  stellarHorizonUrl: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
  verificadorUrl: process.env.NEXT_PUBLIC_VERIFICADOR_URL ?? "http://localhost:3002",
} as const;

export const stellarNetwork = getNetworkConfig(env.stellarNetwork, {
  horizonUrl: env.stellarHorizonUrl,
});
