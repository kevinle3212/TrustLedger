/**
 * Address-safety helpers for EVM wallet/contract addresses.
 *
 * Wraps viem's checksum primitives with total (never-throwing) variants and a
 * constant-shape equality check, so UI code can compare and display
 * user-supplied addresses without try/catch noise or case-sensitivity bugs.
 * Field-level validators with user-facing messages live in
 * `@/lib/validation` ({@link validateEthAddress}, {@link validateSolanaAddress}).
 */

import { getAddress, isAddress } from "viem";

/** The canonical zero address, re-exported for convenient comparisons. */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/** Type guard: true when `value` is a syntactically valid EVM address. */
export function isEvmAddress(value: string): value is `0x${string}` {
	return isAddress(value);
}

/**
 * Returns the EIP-55 checksummed form of `value`, or `undefined` when it is not
 * a valid address. Never throws (viem's `getAddress` throws on bad input).
 */
export function toChecksumAddress(value: string): `0x${string}` | undefined {
	try {
		return getAddress(value);
	} catch {
		return undefined;
	}
}

/**
 * Case-insensitive, checksum-agnostic address equality. Returns `false` when
 * either value is not a valid address (so malformed input never compares equal).
 */
export function addressesEqual(a: string, b: string): boolean {
	const left = toChecksumAddress(a);
	const right = toChecksumAddress(b);
	return left !== undefined && left === right;
}

/** True when `value` is the zero address (any casing). */
export function isZeroAddress(value: string): boolean {
	return addressesEqual(value, ZERO_ADDRESS);
}
