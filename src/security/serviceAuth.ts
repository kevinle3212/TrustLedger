/**
 * Edge-safe recognition of trusted non-browser callers.
 *
 * Same-origin browser requests are identified by their `Origin` header (see
 * {@link import("./csrf").isSameOriginRequest}). Trusted server-to-server
 * callers — the deadline-reminder cron, webhooks, uptime probes — cannot send a
 * browser `Origin`, so they authenticate with a bearer service token instead.
 *
 * The routing proxy combines both checks so it accepts legitimate browser and
 * machine traffic while still rejecting cross-origin, cookie-driven CSRF.
 *
 * Runs in the edge runtime, so it deliberately avoids `node:crypto` (which is
 * unavailable there) and uses a local constant-time comparison.
 */

import type { NextRequest } from "next/server";

/**
 * Constant-time string comparison. The length check is allowed to short-circuit
 * (token length is not secret); the per-character pass avoids leaking how many
 * leading characters matched.
 */
function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) return false;
	let mismatch = 0;
	for (let i = 0; i < left.length; i++) {
		mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
	}
	return mismatch === 0;
}

/**
 * Bearer secrets that mark a request as a trusted internal caller. `CRON_SECRET`
 * is the existing Vercel Cron token; `INTERNAL_API_TOKEN` is a general-purpose
 * secret for other server-to-server callers. Unset/empty values are ignored.
 */
function trustedTokens(): string[] {
	return [process.env["CRON_SECRET"], process.env["INTERNAL_API_TOKEN"]].filter(
		(token): token is string => token !== undefined && token !== "",
	);
}

/** Extracts the `Authorization: Bearer <token>` value, or `""` when absent. */
function bearerToken(req: NextRequest): string {
	const header = req.headers.get("authorization");
	return header?.startsWith("Bearer ") === true ? header.slice("Bearer ".length) : "";
}

/**
 * Returns `true` when the request presents a bearer token matching a configured
 * internal service secret. Returns `false` when no service token is configured,
 * so it never weakens the same-origin check on its own.
 */
export function isTrustedServiceRequest(req: NextRequest): boolean {
	const provided = bearerToken(req);
	if (provided === "") return false;
	return trustedTokens().some((token) => timingSafeEqual(provided, token));
}
