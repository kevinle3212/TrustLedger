/**
 * Shared building blocks for the per-asset staking adapters (ETH / USDC / SOL).
 *
 * Adapters are intentionally chain-client-agnostic: they decide *whether* an asset can be read or
 * written (from {@link getStakeAssetStatus}) and *what* action sequence fulfills an intent, then
 * delegate the actual on-chain reads to an injected {@link StakeReader}. This keeps the planning
 * and gating logic pure and unit-testable without wagmi/viem or web3.js, and guarantees that an
 * unconfigured asset can never produce a runnable action.
 */
import { STAKE_ASSETS, type StakeAsset, type StakeAssetId } from "../assets";
import { getStakeAssetStatus, type StakeAvailabilityContext } from "../config";
import type { StakeAdapterCapability, StakeBalance, StakeReward } from "../abstractions";

/**
 * On-chain read surface an adapter needs. Concrete implementations live with their chain client
 * (viem `publicClient.readContract` for EVM, `@solana/web3.js` account reads for Solana). All
 * amounts are smallest units (`bigint`) interpreted via the asset's decimals.
 */
export interface StakeReader {
	/** Spendable wallet balance of the staking asset for `account`. */
	readonly walletBalance: (account: string) => Promise<bigint>;
	/** Amount currently staked by `account`. */
	readonly stakedBalance: (account: string) => Promise<bigint>;
	/** Claimable, unclaimed reward for `account`. */
	readonly claimableReward: (account: string) => Promise<bigint>;
	/** Optional annualized reward-rate estimate in basis points. */
	readonly rewardAprBps?: (account: string) => Promise<number | undefined>;
}

/** Resolves the adapter capability for an asset from the runtime availability context. */
export function resolveCapability(
	assetId: StakeAssetId,
	context: StakeAvailabilityContext,
): StakeAdapterCapability {
	const status = getStakeAssetStatus(assetId, context);
	return {
		assetId,
		canRead: status.configured,
		canWrite: status.configured,
		status: status.reason,
	};
}

/** Returns the asset descriptor for an id. */
function assetOf(assetId: StakeAssetId): StakeAsset {
	return STAKE_ASSETS[assetId];
}

/**
 * Reads a normalized balance, or `null` when the asset is unconfigured (so the UI shows an
 * "unavailable" state) or when no reader is wired (e.g. server render before the client mounts).
 */
export async function readBalanceVia(
	assetId: StakeAssetId,
	capability: StakeAdapterCapability,
	reader: StakeReader | undefined,
	account: string,
): Promise<StakeBalance | null> {
	if (!capability.canRead || reader === undefined) return null;
	const [wallet, staked] = await Promise.all([
		reader.walletBalance(account),
		reader.stakedBalance(account),
	]);
	return { asset: assetOf(assetId), wallet, staked };
}

/** Reads a normalized reward, or `null` when unconfigured / unwired (see {@link readBalanceVia}). */
export async function readRewardVia(
	assetId: StakeAssetId,
	capability: StakeAdapterCapability,
	reader: StakeReader | undefined,
	account: string,
): Promise<StakeReward | null> {
	if (!capability.canRead || reader === undefined) return null;
	const claimable = await reader.claimableReward(account);
	const aprBps =
		reader.rewardAprBps !== undefined ? await reader.rewardAprBps(account) : undefined;
	return { asset: assetOf(assetId), claimable, ...(aprBps === undefined ? {} : { aprBps }) };
}
