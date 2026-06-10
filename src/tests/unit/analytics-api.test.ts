import { buildWalletAnalyticsMetadata } from "@/lib/analyticsApi";

describe("analytics API metadata", () => {
	it("validates wallet addresses and exposes only privacy-safe metadata", () => {
		const metadata = buildWalletAnalyticsMetadata("0x1111111111111111111111111111111111111111");

		expect(metadata).not.toBeNull();
		expect(metadata?.privacyBoundary).toContain("No private keys");
		expect(metadata?.privacyBoundary).toContain("No raw documents");
		expect(metadata?.publicSignals).toContain("TrustLedger contract status counts");
		expect(metadata?.fingerprint).toMatch(/^[a-f0-9]{8}$/u);
	});

	it("rejects malformed wallet addresses", () => {
		expect(buildWalletAnalyticsMetadata("not-a-wallet")).toBeNull();
	});
});
