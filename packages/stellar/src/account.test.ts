import { Keypair } from "@stellar/stellar-sdk";
import { describe, expect, it, vi } from "vitest";
import { fundWithFriendbot, getAccountState } from "./account.js";
import { getNetworkConfig } from "./network.js";

const address = Keypair.random().publicKey();
const testnet = getNetworkConfig("testnet");

function respond(status: number, body: unknown = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("getAccountState", () => {
  it("devuelve el saldo nativo de una cuenta existente", async () => {
    const fetchMock = respond(200, {
      balances: [
        { asset_type: "credit_alphanum4", balance: "5.0000000" },
        { asset_type: "native", balance: "10000.0000000" },
      ],
    });

    await expect(getAccountState(address, testnet, fetchMock)).resolves.toEqual(
      { address, exists: true, balanceXlm: "10000.0000000" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `https://horizon-testnet.stellar.org/accounts/${address}`,
    );
  });

  it("marca como inexistente una cuenta que Horizon no conoce", async () => {
    await expect(
      getAccountState(address, testnet, respond(404)),
    ).resolves.toEqual({ address, exists: false, balanceXlm: "0" });
  });

  it("propaga otros errores de Horizon", async () => {
    await expect(
      getAccountState(address, testnet, respond(503)),
    ).rejects.toThrow(/503/);
  });
});

describe("fundWithFriendbot", () => {
  it("acepta que la cuenta ya exista", async () => {
    await expect(
      fundWithFriendbot(address, testnet, respond(400)),
    ).resolves.toBeUndefined();
  });

  it("no está disponible en mainnet", async () => {
    await expect(
      fundWithFriendbot(address, getNetworkConfig("mainnet"), respond(200)),
    ).rejects.toThrow(/mainnet/);
  });
});
