// Shared types describing a TrustLedger escrow contract. These mirror the
// on-chain `EscrowContract` struct and `Status` enum in
// `contracts/src/TrustLedger.sol` so the same shapes can be reused across the
// frontend and any backend service.

import type { Address, Bytes32 } from "./common";

/**
 * A single freelance agreement. This is a faithful mirror of the
 * `EscrowContract` struct returned by `TrustLedger.getContract()`.
 *
 * Integer widths follow viem's ABI decoding: `uint8`/`uint16` fields decode to
 * `number`, while `uint64`/`uint256` fields decode to `bigint`. `status` is
 * typed as `number` to stay assignable from the value returned on-chain; compare
 * it against the `Status` enum values in `contracts/src/TrustLedger.sol`.
 */
export interface Contract {
	/** Who hired the freelancer and deposited the funds. */
	client: Address;
	/** Juror fee kept on dispute, in basis points (100 bps = 1%). */
	arbitrationFeeBps: number;
	/** Warranty holdback portion, in basis points (0 or 500–1500). */
	holdBackBps: number;
	/** Current lifecycle state; mirrors `TrustLedger.Status`. */
	status: number;
	/** Who does the work and receives payment. */
	freelancer: Address;
	/** Unix timestamp after which the freelancer can claim the holdback. */
	warrantyDeadline: bigint;
	/** Unix timestamp when the (buffered) project is due. */
	projectDeadline: bigint;
	/** Seconds the client has to review submitted work (≥ 48h). */
	acceptanceWindow: bigint;
	/** Absolute unix timestamp when the acceptance window closes. */
	acceptanceDeadline: bigint;
	/** Duration in seconds of the warranty holdback period. */
	warrantyPeriod: bigint;
	/** Total escrowed amount in wei (ETH) or token base units. */
	amount: bigint;
	/** Portion withheld for the warranty (a subset of `amount`). */
	holdBackAmount: bigint;
	/** Dispute ID in the Arbitration contract (0 if no dispute). */
	arbitrationId: bigint;
	/** `keccak256` of the off-chain contract document. */
	contractHash: Bytes32;
	/** IPFS or HTTPS URI to the contract document. */
	contractURI: string;
	/** `keccak256` of the deliverable artifact; set when work is submitted. */
	proofOfWorkHash: Bytes32;
	/** IPFS or HTTPS URI to the deliverable. */
	proofOfWorkURI: string;
	/** ERC-20 token escrowed; the zero address means native ETH. */
	token: Address;
	/** ETH/USD value at creation (8 Chainlink decimals); 0 if unavailable. */
	usdValueAtCreation: bigint;
	/** Cancelled predecessor linked for amendment history (`uint256` max = none). */
	previousContractId: bigint;
	/** True when the client initiated and pre-funded this contract; false for freelancer-proposed. */
	proposedByClient: boolean;
	/** True once the freelancer has called acceptContractByFreelancer; client must then fund. */
	freelancerAccepted: boolean;
}
