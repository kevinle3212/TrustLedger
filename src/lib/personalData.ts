/**
 * Client-side personal-data helpers backing the account page's Privacy & Data
 * Rights controls (export and local deletion).
 *
 * TrustLedger keeps no server-side user profile: a "session" is just a wallet
 * connection, and everything the app remembers about a person lives in this
 * browser (wallet-connection state, UI preferences, and cookie-consent choices)
 * plus the immutable public record their transactions leave on-chain. These
 * helpers therefore operate purely on local storage — they let a user download
 * or erase what this device holds, honestly scoped to data the app actually
 * controls. On-chain data cannot be erased and is out of scope by design.
 */

/**
 * Key prefixes for the `localStorage` entries TrustLedger writes. Anything under
 * these is app-owned personal/preference data eligible for export and deletion;
 * everything else in `localStorage` belongs to other origins/extensions and is
 * left untouched.
 *
 * - `trustledger` / `tl-` / `tl_`: our preferences, consent, and UI flags.
 * - `wagmi.` / `@appkit/`: wallet-connection state written by wagmi and Reown
 *   AppKit. Included so a deletion fully signs the wallet out of this browser.
 */
const OWNED_KEY_PREFIXES = ["trustledger", "tl-", "tl_", "wagmi.", "@appkit/"] as const;

/** The cookie-consent decision is mirrored to a cookie of this name (see `lib/cookie-consent.ts`). */
const CONSENT_COOKIE_NAME = "tl-cookie-consent";

/** Shape of the JSON document produced by {@link buildPersonalDataExport}. */
export interface PersonalDataExport {
	/** ISO-8601 timestamp of when the export was generated. */
	exportedAt: string;
	/** Short human-readable note about scope, so the file is self-explanatory. */
	scope: string;
	/** The connected wallet address, or `null` when no wallet is connected. */
	walletAddress: string | null;
	/** Every app-owned `localStorage` entry, keyed by its storage key. */
	localStorage: Record<string, unknown>;
}

/** Returns true when `key` is written by TrustLedger (see {@link OWNED_KEY_PREFIXES}). */
function isOwnedKey(key: string): boolean {
	return OWNED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Lists the app-owned `localStorage` keys currently present in this browser. */
function ownedStorageKeys(): string[] {
	const keys: string[] = [];
	for (let index = 0; index < window.localStorage.length; index += 1) {
		const key = window.localStorage.key(index);
		if (key !== null && isOwnedKey(key)) keys.push(key);
	}
	return keys;
}

/** Parses a stored string as JSON, falling back to the raw string when it is not JSON. */
function parseStoredValue(raw: string): unknown {
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return raw;
	}
}

/**
 * Collects everything this browser holds about the user into a serializable
 * document: the connected wallet address and every app-owned `localStorage`
 * entry (JSON-parsed where possible). Returns an empty-but-valid document during
 * SSR or when storage is unavailable.
 *
 * @param walletAddress - The connected wallet address, or `null`/`undefined`.
 */
export function buildPersonalDataExport(
	walletAddress: string | null | undefined,
): PersonalDataExport {
	const base: PersonalDataExport = {
		exportedAt: new Date().toISOString(),
		scope: "Local browser data only. On-chain transactions are public and immutable and are not included.",
		walletAddress: walletAddress ?? null,
		localStorage: {},
	};
	if (typeof window === "undefined") return base;
	try {
		for (const key of ownedStorageKeys()) {
			const raw = window.localStorage.getItem(key);
			if (raw !== null) base.localStorage[key] = parseStoredValue(raw);
		}
	} catch {
		// Storage can throw in private-mode / sandboxed contexts; return what we have.
	}
	return base;
}

/**
 * Erases every app-owned `localStorage` entry and the mirrored consent cookie
 * from this browser. This is the local half of a data-deletion request: it signs
 * the wallet out of this device and forgets all preferences and consent. It does
 * not — and cannot — touch immutable on-chain data. No-op during SSR.
 */
export function clearLocalPersonalData(): void {
	if (typeof window === "undefined") return;
	try {
		for (const key of ownedStorageKeys()) window.localStorage.removeItem(key);
	} catch {
		// Ignore storage failures; deletion is best-effort per surviving key.
	}
	try {
		document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
	} catch {
		// document.cookie can be unavailable in restricted contexts.
	}
}
