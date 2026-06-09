// Shared types describing reputation ratings, derived from the
// `ReputationRegistry` contract's storage and events.

import type { Address, Hex } from "./common";

/**
 * A single reputation rating (1–100) submitted on-chain for a contract
 * participant, as emitted by the `RatingSubmitted` event.
 */
export interface Rating {
	/** Escrow contract ID the rating is tied to. */
	id: bigint;
	/** Address that submitted the rating. */
	rater: Address;
	/** Score from 1 to 100. */
	score: number;
}

/**
 * Aggregate reputation for an address, derived from `averageRating()`, which
 * returns the cumulative `(numerator, denominator)` pair rather than a
 * pre-computed average.
 */
export interface ReputationSummary {
	/** Cumulative sum of all rating scores. */
	numerator: bigint;
	/** Total rating count (the average's denominator). */
	denominator: bigint;
	/** `numerator / denominator`, or `null` when there are no ratings yet. */
	average: number | null;
}

/**
 * A single entry in an address's reputation history feed, built from on-chain
 * events. A `"rating"` entry comes from `RatingSubmitted`; a `"recovery"` entry
 * comes from `RecoveryAchieved` (a synthetic bonus rating) and has no `rater`
 * or `contractId`.
 */
export interface ReputationHistoryEntry {
	/** Which event produced this entry. */
	type: "rating" | "recovery";
	/** The score (1–100), or the synthetic recovery bonus. */
	score: number;
	/** Block number the event was emitted in. */
	blockNumber: bigint;
	/** Transaction hash that emitted the event. */
	txHash: Hex;
	/** Who submitted the rating, or `null` for recovery entries. */
	rater: Address | null;
	/** Escrow contract ID for ratings, or `null` for recovery entries. */
	contractId: bigint | null;
}
