import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { isSameOriginRequest } from "@/security/csrf";
import { applySecurityHeaders } from "@/security/headers";
import { createRateLimiter } from "@/security/rateLimit";

// Routing proxy (Next.js 16's replacement for the deprecated `middleware.ts`
// convention) that runs before every matched request. It does two things, both
// server-side concerns the Phase 2 architecture work called for:
//
//   1. Security headers — applied to every response so the whole app (pages and
//      API routes) ships the same baseline hardening regardless of which route
//      produced it.
//   2. Lightweight rate limiting for `/api/*` — a first line of defence for the
//      email-sending and on-chain-reading endpoints against accidental loops and
//      casual abuse.
//   3. Origin-based CSRF protection for `/api/*` — cross-origin state-changing
//      requests are rejected before they reach a route handler.
//
// The security headers and Content-Security-Policy live in `@/security/headers`
// (with their full rationale); the rate limiter is `@/security/rateLimit` and
// the origin check is `@/security/csrf`.

const RATE_LIMIT = 30; // requests …
const WINDOW_MS = 60_000; // … per minute per IP
const apiRateLimiter = createRateLimiter(RATE_LIMIT, WINDOW_MS);
const handleI18nRouting = createIntlMiddleware(routing);

/** Best-effort client IP from forwarded headers (Vercel sets x-forwarded-for). */
function clientIp(req: NextRequest): string {
	const fwd = req.headers.get("x-forwarded-for");
	if (fwd !== null && fwd !== "") return fwd.split(",")[0]?.trim() ?? "unknown";
	return req.headers.get("x-real-ip") ?? "unknown";
}

export function proxy(req: NextRequest): NextResponse {
	const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

	// Reject cross-origin state-changing API requests before any side effects.
	// Read-only methods and same-origin requests pass through untouched.
	if (isApiRoute && !isSameOriginRequest(req)) {
		const res = NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
		applySecurityHeaders(res.headers);
		return res;
	}

	// Rate-limit API routes only; static assets and pages are cheap and cacheable.
	if (isApiRoute && apiRateLimiter.check(clientIp(req))) {
		const res = NextResponse.json(
			{ error: "rate limit exceeded, try again shortly" },
			{ status: 429 },
		);
		res.headers.set("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
		applySecurityHeaders(res.headers);
		return res;
	}

	const res = isApiRoute ? NextResponse.next() : handleI18nRouting(req);
	applySecurityHeaders(res.headers);
	return res;
}

// Run on everything except Next internals and static files. The negative
// lookahead keeps `_next/static`, `_next/image`, the favicon, and common asset
// extensions out of the proxy to avoid needless work on cached resources.
export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
