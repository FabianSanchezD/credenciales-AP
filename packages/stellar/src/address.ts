import { StrKey } from "@stellar/stellar-sdk";

/** Cuenta clásica de Stellar (`G…`), la que entrega Cavos al titular. */
export function isStellarAccountAddress(value: unknown): value is string {
  return typeof value === "string" && StrKey.isValidEd25519PublicKey(value);
}
