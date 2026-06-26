/**
 * Persists the *label* of the most recently used wallet connector so the connect
 * button can offer a one-tap "Reconnect with <Wallet>" after a logout or session
 * expiry.
 *
 * Security note: this stores only the human-readable connector name (e.g.
 * "MetaMask", "WalletConnect") — never a private key, signature, session token,
 * or any authorization material. It is a pure UX convenience layered on top of
 * wagmi's existing connection storage and grants no access on its own; a
 * reconnect always re-prompts the underlying wallet.
 */

const LAST_WALLET_KEY = "trustledger:last-wallet";
const MAX_WALLET_LABEL_LENGTH = 48;

/**
 * Converts a connector label into UI-safe copy.
 *
 * Connector names come from wallet providers, so keep only a compact label and
 * avoid persisting placeholder values that would make the reconnect hint wrong.
 */
function normalizeWalletName(name: string): string | null {
	const normalized = name.replace(/\s+/g, " ").trim();
	if (normalized === "" || normalized.length > MAX_WALLET_LABEL_LENGTH) return null;
	if (/^(null|undefined|unknown)$/iu.test(normalized)) return null;
	return normalized;
}

/** Returns the remembered connector label, or `null` when none is stored. */
export function getLastWallet(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const remembered = window.localStorage.getItem(LAST_WALLET_KEY);
		if (remembered === null) return null;
		const normalized = normalizeWalletName(remembered);
		if (normalized === null) {
			window.localStorage.removeItem(LAST_WALLET_KEY);
			return null;
		}
		if (normalized !== remembered) {
			window.localStorage.setItem(LAST_WALLET_KEY, normalized);
		}
		return normalized;
	} catch {
		// localStorage can throw in private-mode / sandboxed contexts.
		return null;
	}
}

/**
 * wagmi persists the id of the most recently used connector under this key (the
 * default `wagmi` storage prefix + `.recentConnectorId`). Its presence is the
 * canonical "this browser has an active wallet session to restore" signal —
 * independent of our human-readable {@link getLastWallet} label, which exists
 * only for the reconnect hint and can be absent even when a session persists.
 */
const WAGMI_RECENT_CONNECTOR_KEY = "wagmi.recentConnectorId";

// AppKit persists its own restore signals under these keys, independent of
// wagmi's recent-connector record. `syncExistingConnection` (the routine that
// actually restores the account when AppKit initializes) reads the connected
// namespaces, so these are the *authoritative* "there is a session to restore"
// markers. A profile can carry the AppKit keys without the wagmi one (or vice
// versa) depending on connector type and write ordering, so the init gate must
// accept any of them or it will skip restoration and leave the user logged out.
const APPKIT_CONNECTED_NAMESPACES_KEY = "@appkit/connected_namespaces";
const APPKIT_CONNECTION_STATUS_KEY = "@appkit/connection_status";

function hasNonEmptyStorageValue(key: string): boolean {
	const value = window.localStorage.getItem(key);
	return value !== null && value !== "" && value !== "null" && value !== "[]";
}

/**
 * Returns true when this browser holds a wallet session to restore. Used to
 * decide whether AppKit must initialize on load so its connectors are registered
 * and {@link https://docs.reown.com AppKit's} `syncExistingConnection` can
 * restore the account across reloads and direct URL navigation.
 *
 * Checks AppKit's own restore markers (`@appkit/connected_namespaces`,
 * `@appkit/connection_status`) as well as wagmi's recent-connector record so the
 * gate matches AppKit's actual restore condition rather than a single proxy
 * signal. Falls back to `false` in non-browser or sandboxed contexts.
 */
export function hasPersistedWalletSession(): boolean {
	if (typeof window === "undefined") return false;
	try {
		if (window.localStorage.getItem(APPKIT_CONNECTION_STATUS_KEY) === "connected") {
			return true;
		}
		return (
			hasNonEmptyStorageValue(APPKIT_CONNECTED_NAMESPACES_KEY) ||
			hasNonEmptyStorageValue(WAGMI_RECENT_CONNECTOR_KEY)
		);
	} catch {
		return false;
	}
}

/** Remembers `name` as the most recently used connector label. */
export function setLastWallet(name: string): void {
	if (typeof window === "undefined") return;
	const normalized = normalizeWalletName(name);
	if (normalized === null) return;
	try {
		window.localStorage.setItem(LAST_WALLET_KEY, normalized);
	} catch {
		// Ignore storage failures - the reconnect hint is best-effort.
	}
}
