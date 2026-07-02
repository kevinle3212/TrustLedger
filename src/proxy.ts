import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { isSameOriginRequest } from "@/security/csrf";
import { applySecurityHeaders } from "@/security/headers";
import { createRateLimiter } from "@/security/rateLimit";
import { isTrustedServiceRequest } from "@/security/serviceAuth";

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
//   3. CSRF protection for `/api/*` — state-changing requests must be either
//      same-origin (browser) or carry a valid internal service token (cron,
//      webhooks, server-to-server). Anything else is rejected before it reaches
//      a route handler.
//
// The security headers and Content-Security-Policy live in `@/security/headers`
// (with their full rationale); the rate limiter is `@/security/rateLimit`, the
// origin check is `@/security/csrf`, and the service-token check is
// `@/security/serviceAuth`.

const RATE_LIMIT = 30; // requests …
const WINDOW_MS = 60_000; // … per minute per IP
const apiRateLimiter = createRateLimiter(RATE_LIMIT, WINDOW_MS);
const handleI18nRouting = createIntlMiddleware(routing);

/** Path segments (after an optional locale prefix) that are IP-restricted. */
const SENSITIVE_SEGMENTS = new Set(["admin"]);
/** Unmatched sentinel segment used to render the branded 404 via rewrite. */
const NOT_FOUND_SENTINEL = "not-found";

/** Best-effort client IP from forwarded headers (Vercel sets x-forwarded-for). */
function clientIp(req: NextRequest): string {
	const fwd = req.headers.get("x-forwarded-for");
	if (fwd !== null && fwd !== "") return fwd.split(",")[0]?.trim() ?? "unknown";
	return req.headers.get("x-real-ip") ?? "unknown";
}

function parseCsv(value: string | undefined): string[] {
	if (value === undefined || value === "") return [];
	return value
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry !== "");
}

function isLoopbackIp(ip: string): boolean {
	return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/** Resolves the locale prefix of a pathname, defaulting to the routing default. */
function detectLocale(pathname: string): string {
	const first = pathname.split("/")[1] ?? "";
	return (routing.locales as readonly string[]).includes(first) ? first : routing.defaultLocale;
}

/** Whether a pathname targets a sensitive, IP-restricted surface (admin). */
function isSensitivePath(pathname: string): boolean {
	if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) return true;
	const segments = pathname.split("/").filter((segment) => segment !== "");
	// Drop a leading locale segment so `/en/admin` and `/admin` are treated alike.
	const withoutLocale = (routing.locales as readonly string[]).includes(segments[0] ?? "")
		? segments.slice(1)
		: segments;
	return SENSITIVE_SEGMENTS.has(withoutLocale[0] ?? "");
}

/**
 * IP-gate for sensitive surfaces (admin dashboard + admin API). Requests from
 * IPs not on `SENSITIVE_ALLOWED_IPS` (falling back to `ADMIN_ALLOWED_IPS`)
 * receive a branded 404 indistinguishable from any other not-found, so the
 * route's existence is never leaked. Returns `null` when the request is allowed
 * (or no allowlist is configured), letting the caller continue normally.
 */
function sensitiveIpGate(req: NextRequest): NextResponse | null {
	const { pathname } = req.nextUrl;
	if (!isSensitivePath(pathname)) return null;

	const allowedIps = parseCsv(
		process.env["SENSITIVE_ALLOWED_IPS"] ?? process.env["ADMIN_ALLOWED_IPS"],
	);
	if (allowedIps.length === 0) return null; // no restriction configured

	const ip = clientIp(req).toLowerCase();
	const allowed =
		allowedIps.includes(ip) || (process.env.NODE_ENV !== "production" && isLoopbackIp(ip));
	if (allowed) return null;

	const url = req.nextUrl.clone();
	url.pathname = `/${detectLocale(pathname)}/${NOT_FOUND_SENTINEL}`;
	const res = NextResponse.rewrite(url, { status: 404 });
	applySecurityHeaders(res.headers);
	return res;
}

export function proxy(req: NextRequest): NextResponse {
	// Gate sensitive surfaces (admin) by IP first, before any other handling, so
	// a blocked caller gets an ordinary 404 and learns nothing about the route.
	const blocked = sensitiveIpGate(req);
	if (blocked !== null) return blocked;

	const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

	// Reject state-changing API requests that are neither same-origin (browser)
	// nor authenticated with a trusted service token (cron / server-to-server).
	// Read-only methods always pass through untouched.
	if (isApiRoute && !isSameOriginRequest(req) && !isTrustedServiceRequest(req)) {
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
// lookahead keeps `_next/static`, `_next/image`, the favicon, the root metadata
// routes (manifest/robots/sitemap), and common asset extensions out of the proxy.
// Without the metadata exclusions, next-intl rewrites e.g. `/manifest.webmanifest`
// to `/en/manifest.webmanifest`, which 404s — breaking the PWA manifest and SEO
// crawling of robots.txt/sitemap.xml.
export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
