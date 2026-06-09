import { getLastWallet, setLastWallet } from "@/lib/lastWallet";

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
