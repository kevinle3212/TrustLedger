import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

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
// A Content-Security-Policy is applied below alongside the other headers.
// Key decisions:
//   • script-src 'unsafe-inline' — Next.js injects inline hydration scripts;
//     nonce-based CSP is the proper upgrade but requires additional middleware
//     infrastructure and is tracked as a future hardening step.
//   • style-src 'unsafe-inline' — Reown AppKit injects inline styles for its modal.
//   • connect-src https: wss: — broad allow covers arbitrary RPC providers,
//     WalletConnect relay, Pinata, block explorers, and wallet APIs without
//     hardcoding every endpoint (which changes per network and wallet).
//   • frame-src / object-src 'none' — the dApp never embeds iframes or plugins.
//   • base-uri 'self' + form-action 'self' — prevent base-tag injection and
//     cross-origin form submissions, two common XSS escalation vectors.
//   • frame-ancestors 'none' — belt-and-suspenders with X-Frame-Options: DENY.

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
	// Content-Security-Policy — see rationale in the comment above.
	"Content-Security-Policy": [
		"default-src 'self'",
		// Next.js requires 'unsafe-inline' for hydration scripts.
		"script-src 'self' 'unsafe-inline'",
		// AppKit injects inline styles for its modal.
		"style-src 'self' 'unsafe-inline'",
		// Wallet icons come from remote CDNs; data:/blob: for inline SVGs.
		"img-src 'self' data: blob: https:",
		// Fonts use local system stacks; no external font CDN needed.
		"font-src 'self'",
		// Broad HTTPS/WSS allow for RPC providers, WalletConnect relay, Pinata, etc.
		"connect-src 'self' https: wss:",
		// The dApp never embeds iframes.
		"frame-src 'none'",
		// Eliminate the Flash / plugin attack surface.
		"object-src 'none'",
		// Prevent <base href> injection.
		"base-uri 'self'",
		// No cross-origin form submissions.
		"form-action 'self'",
		// Belt-and-suspenders with X-Frame-Options: DENY.
		"frame-ancestors 'none'",
	].join("; "),
};

// ── In-memory rate limiter ───────────────────────────────────────────────────
// Fixed-window counter keyed by client IP. This is best-effort: on serverless /
// Fluid Compute the map lives per instance, so it caps obvious bursts rather than
// enforcing a global quota. A shared store (Upstash/Redis) is the upgrade path
// once a backend exists; the email endpoints also carry their own auth secret.
const RATE_LIMIT = 30; // requests …
const WINDOW_MS = 60_000; // … per minute per IP
const hits = new Map<string, { count: number; resetAt: number }>();
const handleI18nRouting = createIntlMiddleware(routing);

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

	const res = req.nextUrl.pathname.startsWith("/api/")
		? NextResponse.next()
		: handleI18nRouting(req);
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
