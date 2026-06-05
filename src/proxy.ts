import { type NextRequest, NextResponse } from "next/server";

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
//
// Note: a strict Content-Security-Policy is intentionally NOT set here. Reown
// AppKit / WalletConnect inject inline styles and connect to many wallet relays,
// so a tight CSP needs per-deploy tuning; that is tracked as its own Phase 3
// security task. The headers below are the CSP-independent hardening.

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
	// Block MIME-type sniffing so browsers honour declared Content-Types.
	"X-Content-Type-Options": "nosniff",
	// Disallow framing to mitigate clickjacking (the dApp is never embedded).
	"X-Frame-Options": "DENY",
	// Send only the origin on cross-origin navigations; full URL same-origin.
	"Referrer-Policy": "strict-origin-when-cross-origin",
	// Drop access to powerful features the app does not use.
	"Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
	// Force HTTPS for two years including subdomains (ignored on plain HTTP/localhost).
	"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
	// Limit cross-origin window references opened via target=_blank.
	"X-DNS-Prefetch-Control": "on",
};

// ── In-memory rate limiter ───────────────────────────────────────────────────
// Fixed-window counter keyed by client IP. This is best-effort: on serverless /
// Fluid Compute the map lives per instance, so it caps obvious bursts rather than
// enforcing a global quota. A shared store (Upstash/Redis) is the upgrade path
// once a backend exists; the email endpoints also carry their own auth secret.
const RATE_LIMIT = 30; // requests …
const WINDOW_MS = 60_000; // … per minute per IP
const hits = new Map<string, { count: number; resetAt: number }>();

/** Best-effort client IP from forwarded headers (Vercel sets x-forwarded-for). */
function clientIp(req: NextRequest): string {
	const fwd = req.headers.get("x-forwarded-for");
	if (fwd !== null && fwd !== "") return fwd.split(",")[0]?.trim() ?? "unknown";
	return req.headers.get("x-real-ip") ?? "unknown";
}

/** Returns true when the caller has exceeded the window quota. */
function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = hits.get(ip);
	if (entry === undefined || now > entry.resetAt) {
		hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT;
}

export function proxy(req: NextRequest): NextResponse {
	// Rate-limit API routes only; static assets and pages are cheap and cacheable.
	if (req.nextUrl.pathname.startsWith("/api/") && isRateLimited(clientIp(req))) {
		const res = NextResponse.json(
			{ error: "rate limit exceeded, try again shortly" },
			{ status: 429 },
		);
		res.headers.set("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
		for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
		return res;
	}

	const res = NextResponse.next();
	for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
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
