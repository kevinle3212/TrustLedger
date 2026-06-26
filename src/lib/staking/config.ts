/**
 * Runtime staking availability resolution.
 *
 * Resolves, per asset and chain context, whether on-chain staking is actually configured —
 * i.e. whether the contracts/programs and token addresses exist in the environment. The UI
 * uses this to enable a flow only when it can run a real transaction; an unconfigured asset
 * renders a "not yet available on this network" state rather than a mocked path.
 */
import { isLikelySolanaAddress } from "@/helpers/solana";
import {
	getContractDeployment,
	getStakingVaultAddress,
	getUsdcAddress,
	ZERO_ADDRESS,
} from "@/lib/wagmi";

import { getStakeAsset, STAKE_ASSETS, type StakeAsset, type StakeAssetId } from "./assets";

/** Why an asset's staking is unavailable, or `"available"` when fully configured. */
type StakeUnavailableReason =
	| "available"
	| "no-juror-registry"
	| "no-staking-vault"
	| "no-usdc-token"
	| "no-solana-program"
	| "wrong-chain-family"
	| "unknown-asset";

/** Resolved staking status for one asset. */
export interface StakeAssetStatus {
	readonly asset: StakeAsset;
	readonly configured: boolean;
	readonly reason: StakeUnavailableReason;
}

/** Context needed to resolve availability. */
export interface StakeAvailabilityContext {
	/** Connected EVM chain id, or `undefined` when no EVM wallet is connected. */
	readonly chainId?: number;
	/**
	 * The public Solana staking program id. Defaults to
	 * `process.env.NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID`.
	 */
	readonly solanaStakingProgramId?: string;
}

function resolveSolanaProgramId(context: StakeAvailabilityContext): string | undefined {
	return context.solanaStakingProgramId ?? process.env.NEXT_PUBLIC_SOLANA_STAKING_PROGRAM_ID;
}

/** Resolves the staking status for a single asset id under the given context. */
export function getStakeAssetStatus(
	assetId: StakeAssetId,
	context: StakeAvailabilityContext = {},
): StakeAssetStatus {
	const asset = getStakeAsset(assetId);
	if (asset === undefined) {
		return { asset: STAKE_ASSETS.ETH, configured: false, reason: "unknown-asset" };
	}

	if (asset.chainFamily === "solana") {
		const programId = resolveSolanaProgramId(context);
		const configured =
			programId !== undefined && programId !== "" && isLikelySolanaAddress(programId);
		return { asset, configured, reason: configured ? "available" : "no-solana-program" };
	}

	// EVM assets require a connected chain.
	const { chainId } = context;
	if (chainId === undefined) {
		return {
			asset,
			configured: false,
			reason: asset.id === "USDC" ? "no-staking-vault" : "no-juror-registry",
		};
	}

	if (asset.id === "ETH") {
		const registry = getContractDeployment(chainId).jurorRegistry;
		const configured = registry !== ZERO_ADDRESS;
		return { asset, configured, reason: configured ? "available" : "no-juror-registry" };
	}

	// USDC: needs both the deployed vault and the USDC token on this chain.
	const vault = getStakingVaultAddress(chainId);
	if (vault === undefined) {
		return { asset, configured: false, reason: "no-staking-vault" };
	}
	if (getUsdcAddress(chainId) === undefined) {
		return { asset, configured: false, reason: "no-usdc-token" };
	}
	return { asset, configured: true, reason: "available" };
}

/** Resolves staking status for every asset. */
export function getAllStakeAssetStatuses(
	context: StakeAvailabilityContext = {},
): StakeAssetStatus[] {
	return (Object.keys(STAKE_ASSETS) as StakeAssetId[]).map((id) =>
		getStakeAssetStatus(id, context),
	);
}
