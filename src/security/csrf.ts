/**
 * Origin-based CSRF protection for state-changing API routes.
 *
 * The app's `/api/*` handlers are same-origin and cookie-less, but defense in
 * depth is cheap: reject cross-origin state-changing requests (POST/PUT/PATCH/
 * DELETE) whose `Origin` does not match the request host. Read-only methods are
 * always allowed. Use in a route handler before performing side effects.
 *
 * Example:
 *   export async function POST(req: NextRequest) {
 *     if (!isSameOriginRequest(req)) return new Response("Forbidden", { status: 403 });
 *     // ...handle...
 *   }
 */

import type { NextRequest } from "next/server";

/** HTTP methods that mutate state and therefore require an origin check. */
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Returns `true` when the request is safe to process: a read-only method, or a
 * state-changing method whose `Origin` host matches the request host. Requests
 * with a state-changing method and a missing or mismatched `Origin` return
 * `false`.
 */
export function isSameOriginRequest(req: NextRequest): boolean {
	if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) return true;

	const origin = req.headers.get("origin");
	if (origin === null || origin === "") return false;

	let originHost: string;
	try {
		originHost = new URL(origin).host;
	} catch {
		return false;
	}

	// Prefer the forwarded host (set by the platform proxy) over the raw Host
	// header so the check holds behind Vercel/Kubernetes ingress.
	const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
	return host !== null && host !== "" && host === originHost;
}
