// Shared types describing an arbitration dispute. These mirror the on-chain
// `Dispute` struct and `Phase` enum in `contracts/src/Arbitration.sol`.

import type { Address } from "./common";

/**
 * Voting phase of a dispute. The numeric values mirror the on-chain `Phase`
 * enum exactly, so an enum member can be compared directly against the `number`
 * returned by `getDispute()`. `COMMIT`/`REVEAL` apply to original disputes;
 * the `APPEAL_*` phases apply to re-tried disputes after an appeal.
 *
 * @example
 * if (dispute.phase === DisputePhase.Reveal) {
 *   // jurors are revealing their committed votes
 * }
 */
export enum DisputePhase {
	/** Jurors submit hidden vote commitments. */
	Commit = 0,
	/** Jurors reveal their actual votes. */
	Reveal = 1,
	/** Median computed; the appeal window is open. */
	Finalized = 2,
	/** An appeal was filed; the dispute is frozen pending the appeal outcome. */
	Appealed = 3,
	/** Appeal dispute: commit phase. */
	AppealCommit = 4,
	/** Appeal dispute: reveal phase. */
	AppealReveal = 5,
	/** Appeal dispute finalized; the ruling is binding. */
	AppealFinalized = 6,
}

/**
 * Human-readable labels indexed by {@link DisputePhase}.
 *
 * @example
 * DISPUTE_PHASE_LABELS[DisputePhase.Commit]; // "Commit"
 */
export const DISPUTE_PHASE_LABELS = [
	"Commit",
	"Reveal",
	"Finalized",
	"Appealed",
	"Appeal Commit",
	"Appeal Reveal",
	"Appeal Finalized",
] as const;

/**
 * A dispute opened against an escrow contract. This is a faithful mirror of the
 * `Dispute` struct returned by `Arbitration.getDispute()`. Original disputes and
 * appeal disputes share this shape and differ by `parentDisputeId`.
 *
 * Integer widths follow viem's ABI decoding: `uint64` and `uint256` fields
 * decode to `bigint`. `phase` is typed as `number` (rather than
 * {@link DisputePhase}) to stay assignable from the value returned on-chain;
 * compare it against `DisputePhase` members.
 */
export interface Dispute {
	/** TrustLedger escrow ID this dispute belongs to. */
	contractId: bigint;
	/** Client address, copied from TrustLedger for convenience. */
	client: Address;
	/** Current voting phase; see {@link DisputePhase}. */
	phase: number;
	/** True once `finalizeDispute()` has succeeded. */
	finalized: boolean;
	/** True once `appeal()` has been filed. */
	appealed: boolean;
	/** True once VRF randomness arrived and jurors were pre-selected. */
	vrfFulfilled: boolean;
	/** Unix timestamp when the current phase expires. */
	phaseDeadline: bigint;
	/** Freelancer address, copied from TrustLedger for convenience. */
	freelancer: Address;
	/** Total escrow value, for reference (not held by the dispute). */
	contractAmount: bigint;
	/** ETH held by the contract as the juror reward pool. */
	feePool: bigint;
	/** Finalized completion percentage (0–100); `uint256` max = not set. */
	ruling: bigint;
	/** Who filed the appeal (client or freelancer). */
	appealer: Address;
	/** ETH the appealer paid as a bond. */
	appealBond: bigint;
	/** Dispute ID of the follow-up appeal dispute (`uint256` max = none). */
	appealDisputeId: bigint;
	/** Dispute ID of the original dispute (`uint256` max = this is original). */
	parentDisputeId: bigint;
	/** Maximum juror slots; doubles with each appeal. */
	maxJurors: bigint;
	/** How many jurors have committed so far. */
	jurorCount: bigint;
}
