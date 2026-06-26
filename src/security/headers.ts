/**
 * Centralized HTTP security headers and Content-Security-Policy.
 *
 * The routing proxy (`src/proxy.ts`) stamps {@link SECURITY_HEADERS} on every
 * response so pages and API routes ship the same baseline hardening. Exposed
 * here so route handlers can reuse the exact same policy via
 * {@link applySecurityHeaders}.
 *
 * CSP tradeoffs:
 *   • script-src 'unsafe-inline' — Next.js injects inline hydration scripts;
 *     nonce-based CSP is the proper upgrade but needs extra proxy infrastructure.
 *     'unsafe-eval' is added in development only (see {@link SCRIPT_SRC}).
 *   • style-src 'unsafe-inline' — Reown AppKit injects inline styles for its modal.
 *   • connect-src https: wss: — broad allow covers arbitrary RPC providers,
 *     WalletConnect relay, Pinata, block explorers, and wallet APIs without
 *     hardcoding every per-network/per-wallet endpoint.
 *   • frame-src / object-src 'none' — the dApp never embeds iframes or plugins.
 *   • base-uri / form-action 'self' — block base-tag injection and cross-origin
 *     form posts, two common XSS escalation vectors.
 *   • frame-ancestors 'none' — belt-and-suspenders with X-Frame-Options: DENY.
 */

/**
 * In development, React injects `eval()` for debugging features (callstack
 * reconstruction across environments), which a strict `script-src` blocks and
 * logs as a console error. `'unsafe-eval'` is gated to development only and is
 * never present in production builds, so the production policy stays strict.
 */
const SCRIPT_SRC =
	process.env.NODE_ENV === "development"
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
		: "script-src 'self' 'unsafe-inline'";

/** Ordered Content-Security-Policy directives. */
const CSP_DIRECTIVES: readonly string[] = [
	"default-src 'self'",
	SCRIPT_SRC,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: https:",
	"font-src 'self'",
	"connect-src 'self' https: wss:",
	"frame-src 'none'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
];

/** Returns the assembled `Content-Security-Policy` header value. */
export function buildContentSecurityPolicy(): string {
	return CSP_DIRECTIVES.join("; ");
}

/** Security headers applied to every response. */
export const SECURITY_HEADERS: Record<string, string> = {
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
	// Hint browsers to resolve DNS for outbound asset/RPC hosts early.
	"X-DNS-Prefetch-Control": "on",
	"Content-Security-Policy": buildContentSecurityPolicy(),
};

/** Stamps {@link SECURITY_HEADERS} onto a mutable `Headers` instance. */
export function applySecurityHeaders(headers: Headers): void {
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		headers.set(key, value);
	}
}
