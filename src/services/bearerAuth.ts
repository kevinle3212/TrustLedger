import crypto from "node:crypto";

export function timingSafeEqualString(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return (
		leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
	);
}

export function isAuthorizedBearer(header: string | null, secret: string | undefined): boolean {
	if (secret === undefined || secret === "" || header?.startsWith("Bearer ") !== true) {
		return false;
	}
	return timingSafeEqualString(header.slice("Bearer ".length), secret);
}
