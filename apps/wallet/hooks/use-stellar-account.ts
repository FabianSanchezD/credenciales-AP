"use client";

import {
  fundWithFriendbot,
  getAccountState,
  type StellarAccountState,
} from "@repo/stellar";
import { useCallback, useEffect, useState } from "react";
import { stellarNetwork } from "../lib/stellar/network";

/** Estado on-chain (Horizon) de una cuenta Stellar. */
export function useStellarAccount(address: string | null) {
  const [account, setAccount] = useState<StellarAccountState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setAccount(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setAccount(await getAccountState(address, stellarNetwork));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Solo testnet: crea la cuenta on-chain con XLM de prueba (Friendbot). */
  const fundOnTestnet = useCallback(async () => {
    if (!address) throw new Error("La wallet todavía no tiene dirección");
    await fundWithFriendbot(address, stellarNetwork);
    await refresh();
  }, [address, refresh]);

  return {
    account,
    error,
    isLoading,
    refresh,
    fundOnTestnet: stellarNetwork.friendbotUrl ? fundOnTestnet : null,
  };
}
