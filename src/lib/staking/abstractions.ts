/**
 * Chain-agnostic staking abstractions: balance, reward, and transaction shapes shared by the
 * ETH, USDC, and SOL flows. These decouple the UI from any specific client (wagmi/viem for EVM,
 * web3.js for Solana): a per-asset adapter produces these structures, and the UI renders them
 * uniformly. Amounts are always `bigint` smallest units interpreted via the asset's decimals.
 */
import type { StakeAsset, StakeAssetId } from "./assets";

/** A wallet/staked balance reading for one asset. */
export interface StakeBalance {
	readonly asset: StakeAsset;
	/** Spendable wallet balance in smallest units. */
	readonly wallet: bigint;
	/** Amount currently staked by the account in smallest units. */
	readonly staked: bigint;
}

/** Reward accrual reading for one asset. */
export interface StakeReward {
	readonly asset: StakeAsset;
	/** Claimable reward in smallest units (0 when the asset pays no rewards). */
	readonly claimable: bigint;
	/** Optional annualized reward-rate estimate, in basis points (100 = 1%). */
	readonly aprBps?: number;
}

/** The user-intent kinds an adapter can build a transaction for. */
export type StakeActionKind = "stake" | "unstake" | "claim" | "approve";

/**
 * A normalized, not-yet-submitted staking action. Adapters translate this into a concrete EVM
 * call (e.g. `JurorRegistry.register` / `StakingVault.stake` / ERC-20 `approve`) or a Solana
 * instruction. `amount` is omitted for `claim`.
 */
export interface StakeActionRequest {
	readonly assetId: StakeAssetId;
	readonly kind: StakeActionKind;
	readonly amount?: bigint;
}

/** Whether an adapter can currently service an asset, and why not when it cannot. */
export interface StakeAdapterCapability {
	readonly assetId: StakeAssetId;
	readonly canRead: boolean;
	readonly canWrite: boolean;
	/** Human-meaningful status key mirrored from {@link ./config}'s reason. */
	readonly status: string;
}

/**
 * Minimal adapter contract. Concrete implementations live alongside their chain client:
 * EVM (ETH/USDC) over wagmi/viem, Solana (SOL) over web3.js. Reads return `null` when the
 * asset is unconfigured so callers can show an "unavailable" state without throwing.
 */
export interface StakeAdapter {
	readonly assetId: StakeAssetId;
	readonly capability: () => StakeAdapterCapability;
	readonly readBalance: (account: string) => Promise<StakeBalance | null>;
	readonly readReward: (account: string) => Promise<StakeReward | null>;
	/** Returns the action requests required to fulfill the intent (e.g. approve + stake). */
	readonly planAction: (request: StakeActionRequest) => StakeActionRequest[];
}
