import { isStellarAccountAddress } from "./address.js";
import type { StellarNetworkConfig } from "./network.js";

export interface StellarAccountState {
  address: string;
  /** La cuenta ya fue creada on-chain (Cavos la crea de forma diferida). */
  exists: boolean;
  /** Saldo nativo en XLM, como string decimal. `"0"` si la cuenta no existe. */
  balanceXlm: string;
}

type Fetch = typeof fetch;

interface HorizonBalance {
  asset_type: string;
  balance: string;
}

function assertAddress(address: string): void {
  if (!isStellarAccountAddress(address)) {
    throw new Error(`Dirección de Stellar inválida: ${address}`);
  }
}

export async function getAccountState(
  address: string,
  config: StellarNetworkConfig,
  fetchImpl: Fetch = fetch,
): Promise<StellarAccountState> {
  assertAddress(address);
  const response = await fetchImpl(
    `${config.horizonUrl}/accounts/${encodeURIComponent(address)}`,
  );

  if (response.status === 404) {
    return { address, exists: false, balanceXlm: "0" };
  }
  if (!response.ok) {
    throw new Error(
      `Horizon respondió ${response.status} al consultar la cuenta ${address}`,
    );
  }

  const body = (await response.json()) as { balances?: HorizonBalance[] };
  const native = body.balances?.find((b) => b.asset_type === "native");
  return { address, exists: true, balanceXlm: native?.balance ?? "0" };
}

/** Crea y fondea la cuenta con XLM de prueba. Solo disponible en testnet. */
export async function fundWithFriendbot(
  address: string,
  config: StellarNetworkConfig,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  assertAddress(address);
  if (!config.friendbotUrl) {
    throw new Error(`Friendbot no está disponible en ${config.network}`);
  }
  const response = await fetchImpl(
    `${config.friendbotUrl}?addr=${encodeURIComponent(address)}`,
  );
  // Friendbot responde 400 cuando la cuenta ya existe: no es un error para nosotros.
  if (!response.ok && response.status !== 400) {
    throw new Error(
      `Friendbot respondió ${response.status} al fondear ${address}`,
    );
  }
}
