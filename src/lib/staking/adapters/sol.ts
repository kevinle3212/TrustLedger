/**
 * SOL staking adapter.
 *
 * SOL stakes through the native Solana staking program (`programs/solana-staking`) addressed by
 * `NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID`. Until that program is deployed and its id is published,
 * the adapter is disabled: `capability()` reports `canWrite: false`, `planAction()` returns no
 * actions, and reads return `null`. There is no mocked SOL transaction path. Amounts are in SOL's
 * 9-decimal smallest units (lamports).
 */
import type { StakeAdapter, StakeActionRequest } from "../abstractions";
import type { StakeAvailabilityContext } from "../config";
import { readBalanceVia, readRewardVia, resolveCapability, type StakeReader } from "./shared";

/** Builds the SOL adapter for the given availability context and optional on-chain reader. */
export function createSolAdapter(
	context: StakeAvailabilityContext,
	reader?: StakeReader,
): StakeAdapter {
	const capability = resolveCapability("SOL", context);
	return {
		assetId: "SOL",
		capability: () => capability,
		readBalance: async (account) => await readBalanceVia("SOL", capability, reader, account),
		readReward: async (account) => await readRewardVia("SOL", capability, reader, account),
		planAction(request): StakeActionRequest[] {
			// When no program id is configured, capability.canWrite is false and no action runs.
			if (!capability.canWrite) return [];
			switch (request.kind) {
				case "approve":
					return []; // Native SOL needs no token approval.
				case "stake":
				case "unstake":
					return request.amount === undefined
						? []
						: [{ assetId: "SOL", kind: request.kind, amount: request.amount }];
				case "claim":
					return [{ assetId: "SOL", kind: "claim" }];
			}
		},
	};
}
