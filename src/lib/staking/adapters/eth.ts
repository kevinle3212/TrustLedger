/**
 * ETH staking adapter.
 *
 * ETH is the native juror stake: staking maps to `JurorRegistry.register` (value-bearing call),
 * with no ERC-20 approval step. Availability comes from the JurorRegistry deployment on the
 * connected chain (zero-address ⇒ disabled). Reads delegate to an injected {@link StakeReader}.
 */
import type { StakeAdapter, StakeActionRequest } from "../abstractions";
import type { StakeAvailabilityContext } from "../config";
import { readBalanceVia, readRewardVia, resolveCapability, type StakeReader } from "./shared";

/** Builds the ETH adapter for the given availability context and optional on-chain reader. */
export function createEthAdapter(
	context: StakeAvailabilityContext,
	reader?: StakeReader,
): StakeAdapter {
	const capability = resolveCapability("ETH", context);
	return {
		assetId: "ETH",
		capability: () => capability,
		readBalance: async (account) => await readBalanceVia("ETH", capability, reader, account),
		readReward: async (account) => await readRewardVia("ETH", capability, reader, account),
		planAction(request): StakeActionRequest[] {
			// Disabled assets must never yield a runnable action.
			if (!capability.canWrite) return [];
			switch (request.kind) {
				case "approve":
					return []; // Native ETH needs no token approval.
				case "stake":
				case "unstake":
					return request.amount === undefined
						? []
						: [{ assetId: "ETH", kind: request.kind, amount: request.amount }];
				case "claim":
					return [{ assetId: "ETH", kind: "claim" }];
			}
		},
	};
}
