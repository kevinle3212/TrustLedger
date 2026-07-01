import { buildPersonalDataExport, clearLocalPersonalData } from "@/lib/personalData";

/**
 * Covers the account page's export/erase primitives: the export must gather only
 * app-owned localStorage (leaving other origins' keys alone) plus the wallet
 * address, and the erase must remove every app-owned key and the consent cookie.
 */
describe("personalData", () => {
	beforeEach(() => {
		window.localStorage.clear();
		document.cookie = "tl-cookie-consent=; path=/; max-age=0";
	});

	function seedStorage(): void {
		window.localStorage.setItem("trustledger:last-wallet", "MetaMask");
		window.localStorage.setItem("trustledger_role", "client");
		window.localStorage.setItem("tl-cookie-consent", JSON.stringify({ analytics: true }));
		window.localStorage.setItem("tl_visited", "1");
		window.localStorage.setItem("wagmi.recentConnectorId", '"io.metamask"');
		window.localStorage.setItem("@appkit/connection_status", "connected");
		// A key owned by a different origin/extension that must never be touched.
		window.localStorage.setItem("someOtherApp:token", "secret");
	}

	it("exports app-owned storage and the wallet address, parsing JSON values", () => {
		seedStorage();

		const result = buildPersonalDataExport("0xabc");

		expect(result.walletAddress).toBe("0xabc");
		expect(result.localStorage["trustledger:last-wallet"]).toBe("MetaMask");
		expect(result.localStorage["tl-cookie-consent"]).toEqual({ analytics: true });
		expect(result.localStorage["@appkit/connection_status"]).toBe("connected");
		expect(result.localStorage).not.toHaveProperty("someOtherApp:token");
		expect(typeof result.exportedAt).toBe("string");
	});

	it("records a null wallet address when none is connected", () => {
		const result = buildPersonalDataExport(null);
		expect(result.walletAddress).toBeNull();
	});

	it("erases every app-owned key while leaving foreign keys intact", () => {
		seedStorage();

		clearLocalPersonalData();

		expect(window.localStorage.getItem("trustledger:last-wallet")).toBeNull();
		expect(window.localStorage.getItem("trustledger_role")).toBeNull();
		expect(window.localStorage.getItem("tl-cookie-consent")).toBeNull();
		expect(window.localStorage.getItem("tl_visited")).toBeNull();
		expect(window.localStorage.getItem("wagmi.recentConnectorId")).toBeNull();
		expect(window.localStorage.getItem("@appkit/connection_status")).toBeNull();
		// Foreign key survives.
		expect(window.localStorage.getItem("someOtherApp:token")).toBe("secret");
	});
});
