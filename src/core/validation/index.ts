/**
 * Validation helpers built on `viem` primitives and the core error types.
 *
 * Thin, composable guards that throw {@link ValidationError} with a stable
 * message — usable from forms, API handlers, and the staking calculators.
 */

import { isAddress } from "viem";
import { ValidationError } from "@/core/errors";

/** Result of a non-throwing validation. */
export type ValidationResult = { ok: true } | { ok: false; message: string };

/** Assert a condition or throw a {@link ValidationError}. */
export function assert(condition: unknown, message: string): asserts condition {
	if (condition === false || condition === null || condition === undefined) {
		throw new ValidationError(message);
	}
}

/** EVM address guard. */
export function isEvmAddress(value: string): value is `0x${string}` {
	return isAddress(value);
}

/**
 * Validate a human-entered token amount against an asset's decimals.
 * Accepts a decimal string (e.g. "1.5"); rejects empty, non-numeric, negative,
 * zero, and over-precise values.
 */
export function validateAmount(input: string, decimals: number): ValidationResult {
	const trimmed = input.trim();
	if (trimmed === "") return { ok: false, message: "Amount is required" };
	if (!/^\d*\.?\d*$/.test(trimmed)) return { ok: false, message: "Amount must be a number" };
	const value = Number(trimmed);
	if (!Number.isFinite(value) || value <= 0) {
		return { ok: false, message: "Amount must be greater than zero" };
	}
	const fraction = trimmed.split(".")[1];
	if (fraction !== undefined && fraction.length > decimals) {
		return { ok: false, message: `Amount exceeds ${String(decimals)} decimal places` };
	}
	return { ok: true };
}

/** Throwing variant of {@link validateAmount}. */
export function assertAmount(input: string, decimals: number): void {
	const result = validateAmount(input, decimals);
	if (!result.ok) throw new ValidationError(result.message, { input });
}
