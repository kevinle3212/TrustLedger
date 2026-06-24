import crypto from "node:crypto";

/**
 * Compares two strings in constant time to avoid leaking length-independent
 * timing information to an attacker probing a secret.
 *
 * @param left - First string (for example a candidate token).
 * @param right - Second string (for example the expected secret).
 * @returns `true` only when both strings have equal length and bytes.
 */
export function timingSafeEqualString(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return (
		leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
	);
}

/**
 * Validates an HTTP `Authorization` header against a shared bearer secret using
 * a constant-time comparison.
 *
 * @param header - Raw `Authorization` header value, or `null` when absent.
 * @param secret - Expected bearer secret; an `undefined` or empty secret always
 *   fails closed.
 * @returns `true` only when the header is `Bearer <secret>` and the token
 *   matches the secret exactly.
 */
export function isAuthorizedBearer(header: string | null, secret: string | undefined): boolean {
	if (secret === undefined || secret === "" || header?.startsWith("Bearer ") !== true) {
		return false;
	}
	return timingSafeEqualString(header.slice("Bearer ".length), secret);
}
