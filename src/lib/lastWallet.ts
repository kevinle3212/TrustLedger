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
