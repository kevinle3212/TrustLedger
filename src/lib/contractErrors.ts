/**
 * Maps TrustLedger custom Solidity errors to human-readable messages and the
 * corresponding form field that caused the revert. Used to surface actionable
 * feedback from simulation failures instead of the generic "reverted" string.
 */

export interface DecodedContractError {
	/** Human-readable explanation of what went wrong. */
	message: string;
	/** Form field key that caused the revert, if applicable. */
	field?: string;
}

const ERROR_MAP: Record<string, DecodedContractError> = {
	ZeroAddress: {
		message: "Client address is required.",
		field: "client",
	},
	SelfContract: {
		message: "You cannot propose a contract to yourself — use a different wallet address.",
		field: "client",
	},
	InsufficientFunds: {
		message: "Escrow amount must be greater than zero.",
		field: "amount",
	},
	EmptyHash: {
		message: "Contract document is missing — upload a file or enter a URI.",
		field: "contractURI",
	},
	EmptyURI: {
		message: "Contract document URI is required — upload a file or enter a URI.",
		field: "contractURI",
	},
	InvalidBufferFactor: {
		message: "Buffer factor must be at least 1100 (a 1.1× multiplier).",
		field: "bufferFactor",
	},
	InvalidAcceptanceWindow: {
		message: "Acceptance window must be at least 48 hours (2 days).",
		field: "acceptanceWindowDays",
	},
	InvalidArbitrationFee: {
		message: "Arbitration fee must be between 0.01% and 50%.",
		field: "arbitrationFeePct",
	},
	InvalidHoldBack: {
		message: "Hold-back percentage must be None, 5%, 10%, or 15%.",
		field: "holdBack",
	},
	InvalidWarrantyPeriod: {
		message: "Set a warranty period when a hold-back is selected, or clear both.",
		field: "warrantyPeriodDays",
	},
	TokenNotAllowed: {
		message: "This token is not supported on the current network.",
		field: "paymentToken",
	},
	InvalidTokenParams: {
		message: "Invalid payment token configuration.",
		field: "paymentToken",
	},
	EnforcedPause: {
		message: "The TrustLedger contract is currently paused — try again later.",
	},
};

/** Pulls the Solidity error name out of a viem/wagmi revert error. */
function extractErrorName(err: Error): string | undefined {
	// viem ContractFunctionRevertedError exposes .data.errorName when decoded
	const anyErr = err as unknown as Record<string, unknown>;
	const data = anyErr["data"];
	if (data !== null && typeof data === "object") {
		const name = (data as Record<string, unknown>)["errorName"];
		if (typeof name === "string") return name;
	}
	// Fallback: extract from the message string, e.g. "reason:\nFooBar()"
	const match = /\b([A-Z][A-Za-z]+)\(\)/.exec(err.message);
	return match?.[1];
}

/**
 * Decodes a viem/wagmi simulation or write error into a structured message.
 * Returns `null` if the error is not a known TrustLedger custom error.
 *
 * @example
 *   const decoded = decodeContractError(simError);
 *   // { message: "Client address is required.", field: "client" }
 */
export function decodeContractError(err: Error | null): DecodedContractError | null {
	if (err === null) return null;
	const name = extractErrorName(err);
	if (name !== undefined && name in ERROR_MAP) return ERROR_MAP[name] ?? null;
	return null;
}
