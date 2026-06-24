import { SUPPORTED_EVIDENCE_SCHEMES } from "@/providers/arbitration";

const MAX_UINT256 = 2n ** 256n - 1n;
const APPEAL_BOND_MULTIPLIER_BPS = 15_000n;
const BPS_DENOMINATOR = 10_000n;
/** Number of most-recent dispute IDs to prefetch on the arbitration dashboard. */
export const RECENT_DISPUTE_LOOKBACK = 25n;

/**
 * Calculates the appeal bond required to challenge a ruling.
 * The bond is a fixed BPS multiplier of the current fee pool.
 */
export function calculateAppealBond(feePool: bigint): bigint {
	return (feePool * APPEAL_BOND_MULTIPLIER_BPS) / BPS_DENOMINATOR;
}

/**
 * Calculates the freelancer's linear partial payout for a disputed escrow.
 * Formula: `(2 × completionPct × amount) / (3 × 100)`.
 */
export function calculateLinearPayout(completionPct: bigint, amount: bigint): bigint {
	return (2n * completionPct * amount) / (3n * 100n);
}

/** Returns `true` if the on-chain ruling value is not the unset sentinel (`MAX_UINT256`). */
export function isRulingSet(ruling: bigint): boolean {
	return ruling !== MAX_UINT256;
}

/** Returns `true` for arbitration phases where a juror can take an action (commit=0, reveal=1, appeal=4, enforce=5). */
export function isActionableJurorPhase(phase: number): boolean {
	return phase === 0 || phase === 1 || phase === 4 || phase === 5;
}

function isEvidenceUri(value: string): boolean {
	const trimmed = value.trim();
	return SUPPORTED_EVIDENCE_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme));
}

/** Trims and collapses internal whitespace in an evidence summary string for consistent storage and validation. */
export function normalizeEvidenceSummary(value: string): string {
	return value.trim().replace(/\s+/g, " ");
}

/**
 * Validates evidence submission input for a dispute.
 *
 * @returns An error message string if invalid, or `undefined` if the input is valid.
 */
export function validateEvidenceInput(input: {
	summary: string;
	uri: string;
	requestedCompletionPct: number;
}): string | undefined {
	if (normalizeEvidenceSummary(input.summary).length < 10) {
		return "Summary must be at least 10 characters.";
	}
	if (!isEvidenceUri(input.uri)) {
		return "Use an IPFS, Arweave, or HTTPS evidence URI.";
	}
	if (!Number.isInteger(input.requestedCompletionPct)) {
		return "Requested completion must be a whole percentage.";
	}
	if (input.requestedCompletionPct < 0 || input.requestedCompletionPct > 100) {
		return "Requested completion must be between 0 and 100.";
	}
	return undefined;
}
