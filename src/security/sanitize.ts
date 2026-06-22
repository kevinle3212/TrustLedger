/**
 * Input/output sanitization helpers.
 *
 * React escapes text it renders, so these are for the cases React does not cover:
 * building strings for non-React sinks (attributes assembled by hand, log lines,
 * downloaded file names), and normalizing untrusted text before storage or echo.
 * They are intentionally conservative and dependency-free.
 */

/** HTML metacharacters that must be escaped in any hand-built HTML/attribute string. */
const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/** Escapes `&<>"'` so the result is safe to interpolate into HTML or an attribute. */
export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Matches ASCII control characters, keeping tab (\t), newline (\n), and CR (\r). */
// eslint-disable-next-line no-control-regex -- intentionally targeting control chars
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strips ASCII control characters (keeps tab, newline, carriage return). */
export function stripControlChars(value: string): string {
	return value.replace(CONTROL_CHARS_RE, "");
}

/**
 * Normalizes free-text input: removes control characters, collapses whitespace
 * runs, and trims. `maxLength` (default 10,000) caps the result to bound memory
 * and downstream cost.
 */
export function sanitizeText(value: string, maxLength = 10_000): string {
	const cleaned = stripControlChars(value).replace(/\s+/g, " ").trim();
	return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/** URL schemes considered safe for user-supplied links. */
const SAFE_URL_SCHEMES = new Set(["http:", "https:", "ipfs:", "ar:", "mailto:"]);

/**
 * Returns a normalized URL string when `value` parses to a safe-scheme absolute
 * URL, otherwise `undefined`. Blocks `javascript:`, `data:`, and other
 * script-capable schemes that enable XSS when reflected into `href`/`src`.
 *
 * Example:
 *   sanitizeUrl("https://x.com")    // "https://x.com/"
 *   sanitizeUrl("javascript:alert") // undefined
 */
export function sanitizeUrl(value: string): string | undefined {
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	try {
		const url = new URL(trimmed);
		return SAFE_URL_SCHEMES.has(url.protocol) ? url.toString() : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Sanitizes a user-supplied file name for safe use in `Content-Disposition`
 * headers and local downloads: strips path separators, control characters, and
 * leading dots, then caps length. Falls back to `download` when nothing remains.
 */
export function sanitizeFileName(value: string, maxLength = 255): string {
	const base = stripControlChars(value)
		.replace(/[/\\]+/g, "_")
		.replace(/^\.+/, "")
		.trim();
	const safe = base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, maxLength);
	return safe === "" ? "download" : safe;
}
