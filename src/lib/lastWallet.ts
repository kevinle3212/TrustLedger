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

/** Returns the remembered connector label, or `null` when none is stored. */
export function getLastWallet(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(LAST_WALLET_KEY);
	} catch {
		// localStorage can throw in private-mode / sandboxed contexts.
		return null;
	}
}

/** Remembers `name` as the most recently used connector label. */
export function setLastWallet(name: string): void {
	if (typeof window === "undefined" || name === "") return;
	try {
		window.localStorage.setItem(LAST_WALLET_KEY, name);
	} catch {
		// Ignore storage failures - the reconnect hint is best-effort.
	}
}

/** Forgets the remembered connector label. */
