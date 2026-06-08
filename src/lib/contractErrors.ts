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
	InvalidClientAddress: {
		message:
			"Client address is required. Enter the wallet that will fund and approve the contract.",
		field: "clientAddress",
	},
	InvalidFreelancerAddress: {
		message:
			"Freelancer address is required. Enter the wallet that will review, accept, and deliver the work.",
		field: "freelancerAddress",
	},
	ClientIsCaller: {
		message: "Client address cannot be your own wallet. Enter the other party's client wallet.",
		field: "clientAddress",
	},
	FreelancerIsCaller: {
		message:
			"Freelancer address cannot be your own wallet. Enter the other party's freelancer wallet.",
		field: "freelancerAddress",
	},
	ProposalAmountZero: {
		message: "Escrow amount must be greater than zero.",
		field: "amount",
	},
	InvalidEstimatedDuration: {
		message: "Estimated duration must be greater than zero days.",
		field: "estimatedDurationDays",
	},
	ContractHashRequired: {
		message: "Contract document hash is missing. Upload a file or enter a document URI.",
		field: "contractURI",
	},
	ContractURIRequired: {
		message: "Contract document URI is required. Upload a file or enter a URI.",
		field: "contractURI",
	},
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

function matchKnownErrorName(value: string): string | undefined {
	const withParens = /\b([A-Z][A-Za-z]+)\(\)/.exec(value);
	if (withParens?.[1] !== undefined) return withParens[1];

	return Object.keys(ERROR_MAP).find((name) => value.includes(name));
}

/** Pulls the Solidity error name out of a viem/wagmi revert error. */
function extractErrorName(err: Error): string | undefined {
	const seen = new Set<unknown>();
	const stack: unknown[] = [err];

	while (stack.length > 0) {
		const current = stack.pop();
		if (current === null || typeof current !== "object" || seen.has(current)) continue;
		seen.add(current);

		const record = current as Record<string, unknown>;
		const data = record["data"];
		if (data !== null && typeof data === "object") {
			const name = (data as Record<string, unknown>)["errorName"];
			if (typeof name === "string") return name;
		}

		for (const key of ["message", "shortMessage", "details"] as const) {
			const value = record[key];
			if (typeof value !== "string") continue;
			const name = matchKnownErrorName(value);
			if (name !== undefined) return name;
		}

		const metaMessages = record["metaMessages"];
		if (Array.isArray(metaMessages)) {
			for (const value of metaMessages) {
				if (typeof value !== "string") continue;
				const name = matchKnownErrorName(value);
				if (name !== undefined) return name;
			}
		}

		stack.push(record["cause"]);
	}

	return undefined;
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
