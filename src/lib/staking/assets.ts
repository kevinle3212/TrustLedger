/**
 * Asset-aware staking primitives.
 *
 * TrustLedger stakes three assets across two chain families:
 *   - ETH  (18 decimals, native EVM)  — the existing JurorRegistry stake.
 *   - USDC ( 6 decimals, ERC-20)      — the StakingVault deposit token.
 *   - SOL  ( 9 decimals, native Solana) — the native Solana staking program.
 *
 * Everything here is pure and framework-agnostic so it can be unit-tested and reused by the
 * wallet UI, the API validators, and analytics without importing wagmi/viem/web3.js. Amounts
 * are always handled as `bigint` in the asset's smallest units; the per-asset `decimals` is the
 * single source of truth for parsing and formatting (this is what keeps USDC's 6-decimal math
 * correct alongside ETH's 18 and SOL's 9).
 */

/** Stable identifier for a stakeable asset. */
export type StakeAssetId = "ETH" | "USDC" | "SOL";

/** Chain family an asset settles on. Determines which wallet/client wires the transaction. */
type StakeChainFamily = "evm" | "solana";

/** How the asset is held on-chain. */
type StakeAssetKind = "native-evm" | "erc20" | "native-solana";

/** Immutable description of a stakeable asset. */
export interface StakeAsset {
	readonly id: StakeAssetId;
	readonly symbol: string;
	readonly name: string;
	/** Smallest-unit precision: ETH 18, USDC 6, SOL 9. */
	readonly decimals: number;
	readonly chainFamily: StakeChainFamily;
	readonly kind: StakeAssetKind;
}

/** The canonical asset registry. Order here is the display order in the asset selector. */
export const STAKE_ASSETS: Record<StakeAssetId, StakeAsset> = {
	ETH: {
		id: "ETH",
		symbol: "ETH",
		name: "Ether",
		decimals: 18,
		chainFamily: "evm",
		kind: "native-evm",
	},
	USDC: {
		id: "USDC",
		symbol: "USDC",
		name: "USD Coin",
		decimals: 6,
		chainFamily: "evm",
		kind: "erc20",
	},
	SOL: {
		id: "SOL",
		symbol: "SOL",
		name: "Solana",
		decimals: 9,
		chainFamily: "solana",
		kind: "native-solana",
	},
};

/** Display order for selectors and summaries. */
const STAKE_ASSET_IDS: readonly StakeAssetId[] = ["ETH", "USDC", "SOL"];

/** Returns true when `value` is a known asset id. */
function isStakeAssetId(value: string): value is StakeAssetId {
	return value === "ETH" || value === "USDC" || value === "SOL";
}

/** Returns the asset descriptor, or `undefined` for an unknown id. */
export function getStakeAsset(id: string): StakeAsset | undefined {
	return isStakeAssetId(id) ? STAKE_ASSETS[id] : undefined;
}

/** All assets in display order. */
export function listStakeAssets(): StakeAsset[] {
	return STAKE_ASSET_IDS.map((id) => STAKE_ASSETS[id]);
}

// ─── Decimal-aware amount handling ─────────────────────────────────────────────

/** Reasons a user-entered amount can be rejected. UI maps these to localized messages. */
export type StakeAmountError =
	| "empty"
	| "invalid-number"
	| "too-many-decimals"
	| "not-positive"
	| "below-min"
	| "insufficient-balance";

/** Result of validating a user-entered stake amount. */
export type StakeAmountValidation =
	| { readonly ok: true; readonly value: bigint }
	| { readonly ok: false; readonly error: StakeAmountError };

/**
 * Parses a decimal string into the asset's smallest units. The input MUST already be a
 * well-formed non-negative decimal with no more fractional digits than `decimals`
 * (see {@link validateStakeAmount}); this function does no validation and assumes that contract.
 */
export function parseAssetAmount(input: string, decimals: number): bigint {
	const [whole, fraction = ""] = input.trim().split(".");
	const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
	const wholeDigits = whole === undefined || whole === "" ? "0" : whole;
	const combined = `${wholeDigits}${paddedFraction}`;
	// `BigInt` of an all-digits string never throws here; leading zeros are fine.
	return BigInt(combined);
}

/**
 * Formats a smallest-units amount as a human-readable decimal string, trimming trailing
 * zeros. `maxFractionDigits` caps displayed precision (defaults to the asset's full decimals).
 */
export function formatAssetAmount(
	amount: bigint,
	decimals: number,
	maxFractionDigits: number = decimals,
): string {
	const negative = amount < 0n;
	const abs = negative ? -amount : amount;
	const base = 10n ** BigInt(decimals);
	const whole = abs / base;
	const fraction = abs % base;

	let fractionStr = fraction.toString().padStart(decimals, "0");
	if (maxFractionDigits < decimals) {
		fractionStr = fractionStr.slice(0, maxFractionDigits);
	}
	fractionStr = fractionStr.replace(/0+$/, "");

	const body = fractionStr === "" ? whole.toString() : `${whole.toString()}.${fractionStr}`;
	return negative ? `-${body}` : body;
}

/**
 * Validates a user-entered stake amount against the asset's decimals and, optionally, a minimum
 * stake and the connected wallet balance. Returns the parsed `bigint` value on success or a
 * stable error code on failure.
 */
export function validateStakeAmount(
	input: string,
	asset: StakeAsset,
	options: { readonly min?: bigint; readonly balance?: bigint } = {},
): StakeAmountValidation {
	const trimmed = input.trim();
	if (trimmed === "") {
		return { ok: false, error: "empty" };
	}
	// Non-negative decimal only: digits, optional single dot, digits. No signs, exponents, commas.
	if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "." || !/\d/.test(trimmed)) {
		return { ok: false, error: "invalid-number" };
	}
	const [, fraction = ""] = trimmed.split(".");
	if (fraction.length > asset.decimals) {
		return { ok: false, error: "too-many-decimals" };
	}

	const value = parseAssetAmount(trimmed, asset.decimals);
	if (value <= 0n) {
		return { ok: false, error: "not-positive" };
	}
	if (options.min !== undefined && value < options.min) {
		return { ok: false, error: "below-min" };
	}
	if (options.balance !== undefined && value > options.balance) {
		return { ok: false, error: "insufficient-balance" };
	}
	return { ok: true, value };
}
