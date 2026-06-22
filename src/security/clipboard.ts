/**
 * Safe clipboard helpers.
 *
 * `navigator.clipboard` is `undefined` on insecure origins (plain HTTP) and in
 * several in-app webviews, even though the DOM lib types it as always present.
 * Calling `navigator.clipboard.writeText(...)` there throws a synchronous
 * `TypeError`, which has caused "click to copy freezes / errors" reports.
 *
 * These helpers guard that case and never throw or reject unhandled, so callers
 * can treat copying as a best-effort action that resolves to whether it worked.
 */

/** True when the Clipboard API is actually present (secure origin, supported UA). */
export function isClipboardAvailable(): boolean {
	return (navigator.clipboard as Clipboard | undefined) !== undefined;
}

/**
 * Copies `text` to the clipboard. Resolves `true` on success, `false` when the
 * clipboard is unavailable or the write is denied. Never throws.
 *
 * Example:
 *   if (await copyToClipboard(address)) showCopiedFeedback();
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	// Cast defeats the DOM lib's over-promise that `clipboard` is non-nullable.
	const clipboard = navigator.clipboard as Clipboard | undefined;
	if (clipboard === undefined) return false;
	try {
		await clipboard.writeText(text);
		return true;
	} catch {
		// User denial, focus loss, or browser policy — treat as a failed copy.
		return false;
	}
}
