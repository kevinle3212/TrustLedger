/**
 * Adapter behavior across the three assets. The focus is the deterministic, chain-free contract:
 * capability gating, action planning (including the USDC approve+stake sequence), and the
 * guarantee that a disabled asset produces neither reads nor runnable actions.
 *
 * `@/lib/wagmi` is mocked so availability is driven by this test, not env/RPC, and so the heavy
 * Reown/WalletConnect ESM is never loaded under Jest.
 */
const CONFIGURED_CHAIN = 11155111; // a chain we mark as fully configured for ETH + USDC
const BARE_CHAIN = 42161; // connected, but no juror registry / vault / usdc

// Literals are inlined here because jest hoists the factory above the const declarations above.
jest.mock("@/lib/wagmi", () => {
	const zero = "0x0000000000000000000000000000000000000000";
	const configured = 11155111;
	return {
		ZERO_ADDRESS: zero,
		getContractDeployment: (
			chainId: number,
		): {
			trustLedger: string;
			arbitration: string;
			jurorRegistry: string;
			reputationRegistry: string;
			deployBlock: undefined;
		} => ({
			trustLedger: zero,
			arbitration: zero,
			jurorRegistry:
				chainId === configured ? "0x000000000000000000000000000000000000bEEF" : zero,
			reputationRegistry: zero,
			deployBlock: undefined,
		}),
		getStakingVaultAddress: (chainId: number): string | undefined =>
			chainId === configured ? "0x000000000000000000000000000000000000cAfE" : undefined,
		getUsdcAddress: (chainId: number): string | undefined =>
			chainId === configured ? "0x000000000000000000000000000000000000dEAd" : undefined,
	};
});

import { getStakeAdapter, type StakeReader } from "@/lib/staking/adapters";

function stubReader(overrides: Partial<StakeReader> = {}): StakeReader {
	return {
		walletBalance: async () => await Promise.resolve(100n),
		stakedBalance: async () => await Promise.resolve(40n),
		claimableReward: async () => await Promise.resolve(7n),
		...overrides,
	};
}

describe("getStakeAdapter — capability gating", () => {
	it("reports ETH available when a JurorRegistry is deployed on the chain", () => {
		const cap = getStakeAdapter("ETH", { chainId: CONFIGURED_CHAIN }).capability();
		expect(cap).toEqual({ assetId: "ETH", canRead: true, canWrite: true, status: "available" });
	});

	it("disables EVM assets when no chain is connected", () => {
		expect(getStakeAdapter("ETH", {}).capability().canWrite).toBe(false);
		expect(getStakeAdapter("USDC", {}).capability().canWrite).toBe(false);
	});

	it("disables ETH and USDC on a chain with no juror registry / vault", () => {
		expect(getStakeAdapter("ETH", { chainId: BARE_CHAIN }).capability().status).toBe(
			"no-juror-registry",
		);
		expect(getStakeAdapter("USDC", { chainId: BARE_CHAIN }).capability().status).toBe(
			"no-staking-vault",
		);
	});

	it("enables USDC only when both the vault and USDC token are configured", () => {
		const cap = getStakeAdapter("USDC", { chainId: CONFIGURED_CHAIN }).capability();
		expect(cap).toEqual({
			assetId: "USDC",
			canRead: true,
			canWrite: true,
			status: "available",
		});
	});

	it("disables SOL until a valid program id is configured", () => {
		expect(getStakeAdapter("SOL", {}).capability().status).toBe("no-solana-program");
		expect(
			getStakeAdapter("SOL", { solanaStakingProgramId: "not-a-real-address" }).capability()
				.canWrite,
		).toBe(false);
		const cap = getStakeAdapter("SOL", {
			solanaStakingProgramId: "Ge69iToz9hpRYYiugMX8N9n5Tns3FcwvaRgTAYLe2tGN",
		}).capability();
		expect(cap).toEqual({ assetId: "SOL", canRead: true, canWrite: true, status: "available" });
	});
});

describe("getStakeAdapter — planAction", () => {
	it("plans a native ETH stake with no approval step", () => {
		const adapter = getStakeAdapter("ETH", { chainId: CONFIGURED_CHAIN });
		expect(adapter.planAction({ assetId: "ETH", kind: "stake", amount: 5n })).toEqual([
			{ assetId: "ETH", kind: "stake", amount: 5n },
		]);
		expect(adapter.planAction({ assetId: "ETH", kind: "approve", amount: 5n })).toEqual([]);
	});

	it("expands a USDC stake into approve + stake (6-decimal units)", () => {
		const adapter = getStakeAdapter("USDC", { chainId: CONFIGURED_CHAIN });
		expect(adapter.planAction({ assetId: "USDC", kind: "stake", amount: 1_000_000n })).toEqual([
			{ assetId: "USDC", kind: "approve", amount: 1_000_000n },
			{ assetId: "USDC", kind: "stake", amount: 1_000_000n },
		]);
		expect(
			adapter.planAction({ assetId: "USDC", kind: "unstake", amount: 1_000_000n }),
		).toEqual([{ assetId: "USDC", kind: "unstake", amount: 1_000_000n }]);
	});

	it("returns no actions for a disabled asset", () => {
		const sol = getStakeAdapter("SOL", {});
		expect(sol.planAction({ assetId: "SOL", kind: "stake", amount: 1n })).toEqual([]);
		expect(sol.planAction({ assetId: "SOL", kind: "claim" })).toEqual([]);
		const usdc = getStakeAdapter("USDC", { chainId: BARE_CHAIN });
		expect(usdc.planAction({ assetId: "USDC", kind: "stake", amount: 1n })).toEqual([]);
	});

	it("omits actions when a required amount is missing", () => {
		const adapter = getStakeAdapter("ETH", { chainId: CONFIGURED_CHAIN });
		expect(adapter.planAction({ assetId: "ETH", kind: "stake" })).toEqual([]);
	});
});

describe("getStakeAdapter — reads", () => {
	it("returns null reads for a disabled asset without calling the reader", async () => {
		let called = false;
		const reader = stubReader({
			walletBalance: async () => {
				called = true;
				return await Promise.resolve(1n);
			},
		});
		const adapter = getStakeAdapter("SOL", {}, reader);
		expect(await adapter.readBalance("acct")).toBeNull();
		expect(await adapter.readReward("acct")).toBeNull();
		expect(called).toBe(false);
	});

	it("returns null when configured but no reader is wired", async () => {
		const adapter = getStakeAdapter("ETH", { chainId: CONFIGURED_CHAIN });
		expect(await adapter.readBalance("acct")).toBeNull();
	});

	it("shapes balance and reward from the injected reader when configured", async () => {
		const adapter = getStakeAdapter(
			"ETH",
			{ chainId: CONFIGURED_CHAIN },
			stubReader({ rewardAprBps: async () => await Promise.resolve(250) }),
		);
		const balance = await adapter.readBalance("acct");
		expect(balance?.asset.id).toBe("ETH");
		expect(balance?.wallet).toBe(100n);
		expect(balance?.staked).toBe(40n);
		const reward = await adapter.readReward("acct");
		expect(reward?.asset.id).toBe("ETH");
		expect(reward?.claimable).toBe(7n);
		expect(reward?.aprBps).toBe(250);
	});
});
