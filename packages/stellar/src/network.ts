import { Networks } from "@stellar/stellar-sdk";

export const STELLAR_NETWORKS = ["testnet", "mainnet"] as const;

export type StellarNetwork = (typeof STELLAR_NETWORKS)[number];

export interface StellarNetworkConfig {
  network: StellarNetwork;
  horizonUrl: string;
  passphrase: string;
  /** Solo existe en testnet: fondea cuentas nuevas con XLM de prueba. */
  friendbotUrl?: string;
}

const DEFAULTS: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    network: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    passphrase: Networks.TESTNET,
    friendbotUrl: "https://friendbot.stellar.org",
  },
  mainnet: {
    network: "mainnet",
    horizonUrl: "https://horizon.stellar.org",
    passphrase: Networks.PUBLIC,
  },
};

export function isStellarNetwork(value: unknown): value is StellarNetwork {
  return (
    typeof value === "string" &&
    (STELLAR_NETWORKS as readonly string[]).includes(value)
  );
}

export function getNetworkConfig(
  network: StellarNetwork,
  overrides: Partial<Omit<StellarNetworkConfig, "network">> = {},
): StellarNetworkConfig {
  const base = DEFAULTS[network];
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    ),
    network,
  };
}
