import { isStellarAccountAddress } from "./address.js";
import { isStellarNetwork, type StellarNetwork } from "./network.js";

const DID_PREFIX = "did:stellar";

export interface DidStellar {
  did: string;
  network: StellarNetwork;
  address: string;
}

/** `did:stellar:<red>:<cuenta G…>`, p. ej. `did:stellar:testnet:GABC…`. */
export function toDidStellar(address: string, network: StellarNetwork): string {
  if (!isStellarAccountAddress(address)) {
    throw new Error(`Dirección de Stellar inválida: ${address}`);
  }
  return `${DID_PREFIX}:${network}:${address}`;
}

export function parseDidStellar(did: string): DidStellar | null {
  const parts = did.split(":");
  if (parts.length !== 4) return null;
  const [scheme, method, network, address] = parts;
  if (`${scheme}:${method}` !== DID_PREFIX) return null;
  if (!isStellarNetwork(network) || !isStellarAccountAddress(address)) {
    return null;
  }
  return { did, network, address };
}

export function isDidStellar(value: unknown): value is string {
  return typeof value === "string" && parseDidStellar(value) !== null;
}
