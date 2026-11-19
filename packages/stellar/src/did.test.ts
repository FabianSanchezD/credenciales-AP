import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { isDidStellar, parseDidStellar, toDidStellar } from "./did.js";

const address = Keypair.random().publicKey();

describe("did:stellar", () => {
  it("arma el DID con la red y la cuenta", () => {
    expect(toDidStellar(address, "testnet")).toBe(
      `did:stellar:testnet:${address}`,
    );
  });

  it("rechaza direcciones inválidas", () => {
    expect(() => toDidStellar("GNOVALIDA", "testnet")).toThrow();
  });

  it("parsea un DID válido", () => {
    expect(parseDidStellar(`did:stellar:mainnet:${address}`)).toEqual({
      did: `did:stellar:mainnet:${address}`,
      network: "mainnet",
      address,
    });
  });

  it.each([
    `did:web:testnet:${address}`,
    `did:stellar:futurenet:${address}`,
    "did:stellar:testnet:GNOVALIDA",
    `did:stellar:${address}`,
    `did:stellar:testnet:${Keypair.random().rawSecretKey().toString("hex")}`,
  ])("rechaza %s", (did) => {
    expect(parseDidStellar(did)).toBeNull();
    expect(isDidStellar(did)).toBe(false);
  });
});
