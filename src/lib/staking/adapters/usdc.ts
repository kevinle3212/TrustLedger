/**
 * USDC staking adapter.
 *
 * USDC stakes through the `StakingVault` contract (`stake` / `withdraw` / `getReward`) and is an
 * ERC-20, so a `stake` intent expands to an `approve` + `stake` sequence. Availability requires
 * both the deployed vault and a known USDC token on the connected chain; a missing/zero vault
 * address resolves to disabled. All amounts are in USDC's 6-decimal smallest units — the asset
 * registry's `decimals` keeps that math correct end to end.
 */
import type { StakeAdapter, StakeActionRequest } from "../abstractions";
import type { StakeAvailabilityContext } from "../config";
import { readBalanceVia, readRewardVia, resolveCapability, type StakeReader } from "./shared";

/** Builds the USDC adapter for the given availability context and optional on-chain reader. */
export function createUsdcAdapter(
	context: StakeAvailabilityContext,
	reader?: StakeReader,
): StakeAdapter {
	const capability = resolveCapability("USDC", context);
	return {
		assetId: "USDC",
		capability: () => capability,
		readBalance: async (account) => await readBalanceVia("USDC", capability, reader, account),
		readReward: async (account) => await readRewardVia("USDC", capability, reader, account),
		planAction(request): StakeActionRequest[] {
			if (!capability.canWrite) return [];
			switch (request.kind) {
				case "approve":
					return request.amount === undefined
						? []
						: [{ assetId: "USDC", kind: "approve", amount: request.amount }];
				case "stake":
					// ERC-20: approve the vault, then deposit.
					return request.amount === undefined
						? []
						: [
								{ assetId: "USDC", kind: "approve", amount: request.amount },
								{ assetId: "USDC", kind: "stake", amount: request.amount },
							];
				case "unstake":
					return request.amount === undefined
						? []
						: [{ assetId: "USDC", kind: "unstake", amount: request.amount }];
				case "claim":
					return [{ assetId: "USDC", kind: "claim" }];
			}
		},
	};
}
