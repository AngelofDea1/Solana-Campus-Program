import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateAddress, formatSol, inspectAccounts, LAMPORTS_PER_SOL } from "../core/solana.js";

describe("Solana Account Viewer Unit Tests", () => {
  describe("validateAddress", () => {
    test("accepts valid Base58 public addresses", () => {
      assert.equal(validateAddress("11111111111111111111111111111111"), "11111111111111111111111111111111");
      assert.equal(
        validateAddress("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
      );
    });

    test("trims whitespace from address", () => {
      assert.equal(
        validateAddress("  11111111111111111111111111111111  "),
        "11111111111111111111111111111111"
      );
    });

    test("throws on invalid address characters and lengths", () => {
      assert.throws(() => validateAddress("invalid-address"), /Invalid Solana address format/);
      assert.throws(() => validateAddress("00000000000000000000000000000000"), /Invalid Solana address format/); // '0' is not in Base58
      assert.throws(() => validateAddress("111"), /Invalid Solana address format/); // too short
    });
  });

  describe("formatSol", () => {
    test("accurately formats zero lamports", () => {
      assert.equal(formatSol(0), "0");
      assert.equal(formatSol(0n), "0");
    });

    test("accurately formats 1 full SOL without precision loss", () => {
      assert.equal(formatSol(LAMPORTS_PER_SOL), "1");
    });

    test("accurately formats fractions and decimals", () => {
      assert.equal(formatSol(1_500_000_000n), "1.5");
      assert.equal(formatSol(100_000_000n), "0.1");
      assert.equal(formatSol(1n), "0.000000001");
      assert.equal(formatSol(50_000_000_000n), "50");
    });

    test("rejects negative lamports", () => {
      assert.throws(() => formatSol(-10), /Lamport amount cannot be negative/);
    });
  });

  describe("inspectAccounts error resilience", () => {
    test("does not fail valid address when one address is bad", async () => {
      // Mock fetch implementation
      const mockFetch: typeof fetch = async (url, init) => {
        const body = JSON.parse(init?.body as string);
        if (body.method === "getMultipleAccounts") {
          return {
            ok: true,
            json: async () => ({
              jsonrpc: "2.0",
              id: 1,
              result: {
                value: [
                  {
                    lamports: 1000000000,
                    owner: "11111111111111111111111111111111",
                    executable: false,
                    data: ["", "base64"],
                  },
                ],
              },
            }),
          } as Response;
        }
        throw new Error("Unexpected RPC method");
      };

      const addresses = ["11111111111111111111111111111111", "invalid_bad_address"];
      const results = await inspectAccounts(addresses, { fetchImpl: mockFetch });

      assert.equal(results.length, 2);
      // First is valid
      assert.equal(results[0].success, true);
      assert.equal(results[0].solFormatted, "1");
      assert.equal(results[0].exists, true);

      // Second failed validation without crashing the batch
      assert.equal(results[1].success, false);
      assert.match(results[1].error || "", /Invalid Solana address/);
    });
  });
});
