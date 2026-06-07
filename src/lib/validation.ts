/**
 * Reusable form-field validators for the TrustLedger frontend.
 *
 * Each validator takes the raw input value and returns either an error message
 * string (explaining *why* the value is invalid and what is accepted) or
 * `undefined` when the value is valid. Components render the returned string as
 * red helper text and block submission while any field has an error.
 *
 * Example:
 *   const error = validateEthAddress(input); // "Enter a valid…" | undefined
 *   <Field error={error}>…</Field>
 */

import { isAddress, parseEther, parseUnits } from "viem";
import { resolveDocUrl } from "@/lib/utils";

/** A validator result: an error message, or `undefined` when valid. */
export type ValidationResult = string | undefined;

/** Requires a non-empty (after trim) value. */
export function validateRequired(value: string, label = "This field"): ValidationResult {
	return value.trim() === "" ? `${label} is required.` : undefined;
}

/** Requires a checksum-valid Ethereum address (0x followed by 40 hex chars). */
export function validateEthAddress(value: string): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return "Enter a wallet address.";
	if (!isAddress(trimmed)) {
		return "Enter a valid Ethereum address (0x followed by 40 hex characters).";
	}
	return undefined;
}

/**
 * Requires a positive ETH amount parseable to wei. `maxEth`, when provided,
 * caps the value (e.g. the user's balance or a contract limit).
 */
export function validateEthAmount(value: string, maxEth?: number): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return "Enter an amount in ETH.";
	const num = Number(trimmed);
	if (!Number.isFinite(num)) return "Enter a valid number, e.g. 0.05.";
	if (num <= 0) return "Amount must be greater than 0 ETH.";
	try {
		parseEther(trimmed);
	} catch {
		return "Enter a valid ETH amount (up to 18 decimal places).";
	}
	if (maxEth !== undefined && num > maxEth) {
		return `Amount exceeds the available ${maxEth.toString()} ETH.`;
	}
	return undefined;
}

/** Requires a finite number within [min, max]; `integer` enforces whole numbers. */
export function validateNumberInRange(
	value: string,
	min: number,
	max: number,
	options: { integer?: boolean; unit?: string } = {},
): ValidationResult {
	const trimmed = value.trim();
	const unit = options.unit !== undefined && options.unit !== "" ? ` ${options.unit}` : "";
	if (trimmed === "") return "Enter a value.";
	const num = Number(trimmed);
	if (!Number.isFinite(num)) return "Enter a valid number.";
	if (options.integer === true && !Number.isInteger(num)) {
		return "Enter a whole number.";
	}
	if (num < min || num > max) {
		return `Enter a value between ${min.toString()} and ${max.toString()}${unit}.`;
	}
	return undefined;
}

/**
 * Requires a positive USDC amount parseable to base units (6 decimals).
 * Enforces a practical cap of 1,000,000 USDC to catch obvious input errors.
 */
export function validateUsdcAmount(value: string, maxUsdc?: number): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return "Enter an amount in USDC.";
	const num = Number(trimmed);
	if (!Number.isFinite(num)) return "Enter a valid number, e.g. 100.";
	if (num <= 0) return "Amount must be greater than 0 USDC.";
	try {
		parseUnits(trimmed, 6);
	} catch {
		return "Enter a valid USDC amount (up to 6 decimal places).";
	}
	if (maxUsdc !== undefined && num > maxUsdc) {
		return `Amount exceeds the available ${maxUsdc.toString()} USDC.`;
	}
	return undefined;
}

/** Requires a finite number strictly greater than 0. */
export function validatePositiveNumber(value: string, label = "Value"): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return `${label} is required.`;
	const num = Number(trimmed);
	if (!Number.isFinite(num)) return "Enter a valid number.";
	if (num <= 0) return `${label} must be greater than 0.`;
	return undefined;
}

/** Requires an integer reputation score in [1, 100]. */
export function validateScore(value: string): ValidationResult {
	return validateNumberInRange(value, 1, 100, { integer: true });
}

/**
 * Validates an off-chain document URI. Empty is allowed (the field is optional);
 * a non-empty value must resolve to a real link (ipfs://, ar://, http(s)://, or
 * a bare IPFS CID). Reuses {@link resolveDocUrl}.
 */
export function validateContractUri(value: string): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	if (resolveDocUrl(trimmed) === undefined) {
		return "Enter an ipfs://, ar://, or https:// link (or a bare IPFS CID).";
	}
	return undefined;
}

/** Like {@link validateContractUri} but the value is mandatory. */
export function validateRequiredUri(value: string): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return "Enter a deliverable URL or IPFS link.";
	return validateContractUri(trimmed);
}

/** CIDv0: base58btc-encoded SHA2-256, always 46 chars starting with "Qm". */
const CIDV0_RE = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
/** CIDv1: multibase-encoded (base32 most common → baf…/bafy…/baga…), 20+ chars. */
const CIDV1_RE = /^b[A-Za-z2-7]{20,}$/;

/**
 * Validates a deliverable submission URI. Stricter than {@link validateContractUri}:
 * only `https://` URLs, `ipfs://` URIs, and raw CIDv0/CIDv1 strings are accepted.
 * `http://`, `ar://`, and everything else are rejected.
 *
 * Example:
 *   validateDeliverableUri("ipfs://Qm…") // undefined (valid)
 *   validateDeliverableUri("http://…")   // error message
 */
export function validateDeliverableUri(value: string): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return "Enter a deliverable URL or IPFS link.";
	const isHttps = trimmed.startsWith("https://") && trimmed.length > "https://".length;
	const isIpfs = trimmed.startsWith("ipfs://") && trimmed.length > "ipfs://".length;
	const isCid = CIDV0_RE.test(trimmed) || CIDV1_RE.test(trimmed);
	if (isHttps || isIpfs || isCid) return undefined;
	return "Must be a valid URL or IPFS link (ipfs://, https://…/ipfs/…, or a CID).";
}

// Pragmatic email shape check: a single @, no spaces, a dot in the domain. Full
// RFC 5322 validation is intentionally avoided - the magic-link send confirms
// deliverability.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates an email address. Empty is allowed unless `required` is set. */
export function validateEmail(value: string, required = false): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return required ? "Enter an email address." : undefined;
	return EMAIL_RE.test(trimmed) ? undefined : "Enter a valid email, e.g. name@example.com.";
}

/** Requires a 0x-prefixed hex string (any non-zero length), e.g. a salt. */
export function validateHex(value: string, label = "Value"): ValidationResult {
	const trimmed = value.trim();
	if (trimmed === "") return `${label} is required.`;
	if (!/^0x[0-9a-fA-F]+$/.test(trimmed)) {
		return `${label} must be a 0x-prefixed hex string.`;
	}
	return undefined;
}
