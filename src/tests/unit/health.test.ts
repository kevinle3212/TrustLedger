import { buildHealthReport, buildRuntimeHealthReport } from "@/services/health";

describe("health report", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			SEPOLIA_RPC_URL: "https://example-rpc.invalid",
			NOTIFICATIONS_SECRET: "notifications",
			CRON_SECRET: "cron",
			NEXT_PUBLIC_APP_URL: "https://trustledger.example",
		};
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("reports healthy when required operational configuration is present", () => {
		const report = buildHealthReport();

		expect(report.ok).toBe(true);
		expect(report.checks.map((check) => check.name)).toContain("oracle-source");
		expect(report.checks.every((check) => !check.detail.includes("notifications"))).toBe(true);
	});

	it("marks missing required runtime configuration as unhealthy", () => {
		delete process.env["SEPOLIA_RPC_URL"];

		const report = buildHealthReport();

		expect(report.ok).toBe(false);
		expect(report.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "sepolia-rpc",
					ok: false,
				}),
			]),
		);
	});

	it("keeps runtime health independent from operational configuration", () => {
		delete process.env["SEPOLIA_RPC_URL"];
		delete process.env["NOTIFICATIONS_SECRET"];
		delete process.env["CRON_SECRET"];

		const report = buildRuntimeHealthReport();

		expect(report.ok).toBe(true);
		expect(report.checks).toEqual([
			expect.objectContaining({
				name: "runtime",
				ok: true,
			}),
		]);
	});

	it("rejects invalid public app URLs", () => {
		process.env.NEXT_PUBLIC_APP_URL = "not a url";

		const report = buildHealthReport();

		expect(report.ok).toBe(false);
		expect(report.checks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "app-url",
					ok: false,
				}),
			]),
		);
	});
});
