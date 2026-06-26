/**
 * USDC staking execution bridge: the activation layer that turns an adapter plan into concrete
 * EVM writes and reads on-chain state through viem. `@/lib/wagmi` is mocked so the heavy
 * Reown/WalletConnect ESM never loads under Jest and the zero-address guard is deterministic.
 */
jest.mock("@/lib/wagmi", () => ({
	ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
}));

import { ERC20_ABI, STAKING_VAULT_ABI } from "@/lib/abi";
import {
	assertUsdcConfigured,
	createUsdcStakeReader,
	toUsdcWriteRequests,
} from "@/lib/staking/execution";
import type { StakeActionRequest } from "@/lib/staking/abstractions";

const VAULT = "0x00000000000000000000000000000000000000A1" as const;
const USDC = "0x00000000000000000000000000000000000000B2" as const;
const ZERO = "0x0000000000000000000000000000000000000000" as const;
const ACCOUNT = "0x00000000000000000000000000000000000000C3";

describe("toUsdcWriteRequests", () => {
	it("returns no writes for an empty plan (disabled asset)", () => {
		expect(toUsdcWriteRequests([], { vault: VAULT, usdc: USDC })).toEqual([]);
	});

	it("maps the approve+stake plan to ordered ERC-20 then vault writes", () => {
		const plan: StakeActionRequest[] = [
			{ assetId: "USDC", kind: "approve", amount: 1_000_000n },
			{ assetId: "USDC", kind: "stake", amount: 1_000_000n },
		];
		const writes = toUsdcWriteRequests(plan, { vault: VAULT, usdc: USDC });
		expect(writes).toEqual([
			{ address: USDC, abi: ERC20_ABI, functionName: "approve", args: [VAULT, 1_000_000n] },
			{ address: VAULT, abi: STAKING_VAULT_ABI, functionName: "stake", args: [1_000_000n] },
		]);
	});

	it("maps unstake to vault.withdraw and claim to vault.getReward", () => {
		expect(
			toUsdcWriteRequests([{ assetId: "USDC", kind: "unstake", amount: 5n }], {
				vault: VAULT,
				usdc: USDC,
			})[0],
		).toMatchObject({ address: VAULT, functionName: "withdraw", args: [5n] });
		expect(
			toUsdcWriteRequests([{ assetId: "USDC", kind: "claim" }], {
				vault: VAULT,
				usdc: USDC,
			})[0],
		).toMatchObject({ address: VAULT, functionName: "getReward", args: [] });
	});

	it("never produces a zero-address write", () => {
		const plan: StakeActionRequest[] = [{ assetId: "USDC", kind: "stake", amount: 1n }];
		expect(() => toUsdcWriteRequests(plan, { vault: ZERO, usdc: USDC })).toThrow();
		expect(() => toUsdcWriteRequests(plan, { vault: VAULT, usdc: ZERO })).toThrow();
		expect(() => {
			assertUsdcConfigured({ vault: ZERO, usdc: ZERO });
		}).toThrow();
	});
});

describe("createUsdcStakeReader", () => {
	it("reads wallet/staked/reward from the correct contracts", async () => {
		const readContract = jest.fn((args: { address: string; functionName: string }): bigint => {
			const { address, functionName } = args;
			if (address === USDC && functionName === "balanceOf") return 7n;
			if (address === VAULT && functionName === "balanceOf") return 3n;
			if (address === VAULT && functionName === "earned") return 2n;
			throw new Error(`unexpected read ${address}.${functionName}`);
		});
		// Minimal viem PublicClient surface used by the reader.
		const reader = createUsdcStakeReader({ readContract } as never, {
			vault: VAULT,
			usdc: USDC,
		});
		await expect(reader.walletBalance(ACCOUNT)).resolves.toBe(7n);
		await expect(reader.stakedBalance(ACCOUNT)).resolves.toBe(3n);
		await expect(reader.claimableReward(ACCOUNT)).resolves.toBe(2n);
	});
});
