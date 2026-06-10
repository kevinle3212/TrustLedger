import { buildScientificAnalyticsManifest } from "@/lib/scientificAnalytics";

describe("scientific analytics manifest", () => {
	it("loads generated scientific artifacts without exposing sensitive fields", () => {
		const manifest = buildScientificAnalyticsManifest();

		expect(manifest.title).toBe("TrustLedger Wallet Analytics Scientific Report");
		expect(Object.keys(manifest.libraries)).toEqual(
			expect.arrayContaining(["bokeh", "pandas", "plotly", "scipy", "seaborn"]),
		);
		expect(manifest.metrics["visibleContracts"]).toBeGreaterThan(0);
		expect(manifest.artifacts.map((artifact) => artifact.path)).toEqual(
			expect.arrayContaining([
				"assets/analytics/wallet-analytics-report.json",
				"assets/analytics/wallet-analytics-plotly.json",
				"assets/analytics/wallet-analytics-bokeh.json",
			]),
		);
		expect(manifest.privacyBoundary.join(" ")).toContain("No private keys");
	});
});
