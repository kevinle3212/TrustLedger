import { getLastWallet, hasPersistedWalletSession, setLastWallet } from "@/lib/lastWallet";

describe("last wallet storage", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("stores only the safe connector label", () => {
		setLastWallet("  Coinbase   Wallet  ");

		expect(getLastWallet()).toBe("Coinbase Wallet");
	});

	it("clears invalid previously stored labels", () => {
		window.localStorage.setItem("trustledger:last-wallet", " undefined ");

		expect(getLastWallet()).toBeNull();
		expect(window.localStorage.getItem("trustledger:last-wallet")).toBeNull();
	});

	it("ignores invalid connector labels", () => {
		setLastWallet("MetaMask");
		setLastWallet(" ".repeat(4));
		setLastWallet("x".repeat(49));

		expect(getLastWallet()).toBe("MetaMask");
	});
});

describe("hasPersistedWalletSession", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("returns false with no session markers", () => {
		expect(hasPersistedWalletSession()).toBe(false);
	});

	it("detects AppKit connected status", () => {
		window.localStorage.setItem("@appkit/connection_status", "connected");

		expect(hasPersistedWalletSession()).toBe(true);
	});

	it("ignores a non-connected AppKit status without other markers", () => {
		window.localStorage.setItem("@appkit/connection_status", "disconnected");

		expect(hasPersistedWalletSession()).toBe(false);
	});

	it("detects AppKit connected namespaces", () => {
		window.localStorage.setItem("@appkit/connected_namespaces", '["eip155"]');

		expect(hasPersistedWalletSession()).toBe(true);
	});

	it("detects the wagmi recent-connector record", () => {
		window.localStorage.setItem("wagmi.recentConnectorId", '"io.metamask"');

		expect(hasPersistedWalletSession()).toBe(true);
	});

	it("treats empty, null-string, and empty-array marker values as no session", () => {
		window.localStorage.setItem("@appkit/connected_namespaces", "[]");
		window.localStorage.setItem("wagmi.recentConnectorId", "");

		expect(hasPersistedWalletSession()).toBe(false);

		window.localStorage.setItem("wagmi.recentConnectorId", "null");

		expect(hasPersistedWalletSession()).toBe(false);
	});
});
