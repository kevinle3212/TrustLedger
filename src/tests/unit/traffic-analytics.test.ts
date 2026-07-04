import {
	recordAnalyticsEvent,
	shouldRespectPrivacyHeaders,
	summarizeAnalyticsEvents,
} from "@/services/trafficAnalytics";

describe("privacy traffic analytics", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			TRUSTLEDGER_ANALYTICS_ENABLED: "true",
			TRUSTLEDGER_ANALYTICS_RETENTION_DAYS: "30",
		};
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("records only sanitized aggregate event fields", () => {
		const record = recordAnalyticsEvent({
			name: "page_view",
			path: "/en/dashboard?token=secret",
			locale: "en",
			referrer: "https://example.com/private",
		});

		expect(record).toEqual(
			expect.objectContaining({
				name: "page_view",
				path: "/en/dashboard",
				locale: "en",
			}),
		);
		expect(JSON.stringify(record)).not.toContain("secret");
		expect(JSON.stringify(record)).not.toContain("example.com");
	});

	it("does not record when analytics are disabled", () => {
		process.env.TRUSTLEDGER_ANALYTICS_ENABLED = "false";

		expect(recordAnalyticsEvent({ name: "page_view", path: "/en", locale: "en" })).toBeNull();
	});

	it("honors Do Not Track and Global Privacy Control headers", () => {
		expect(shouldRespectPrivacyHeaders(new Headers({ dnt: "1" }))).toBe(true);
		expect(shouldRespectPrivacyHeaders(new Headers({ "sec-gpc": "1" }))).toBe(true);
	});

	it("summarizes events without exposing identifiers", () => {
		recordAnalyticsEvent({ name: "frontend_error", path: "/en/create", locale: "en" });

		const summary = summarizeAnalyticsEvents();

		expect(summary.enabled).toBe(true);
		expect(summary.privacyBoundary).toContain("No wallet addresses");
		expect(summary.frontendErrors).toBeGreaterThanOrEqual(1);
	});
});
