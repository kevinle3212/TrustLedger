import { buildHealthReport, buildRuntimeHealthReport } from "@/services/health";
import { isAuthorizedHealthRequest } from "@/services/healthAuth";

describe("health report", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			SEPOLIA_RPC_URL: "https://example-rpc.invalid",
			NOTIFICATIONS_SECRET: "notifications",
			CRON_SECRET: "cron",
			NEXT_PUBLIC_APP_URL: "https://trustledger.example",
			HEALTH_CHECK_TOKEN: "health-token",
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
		delete process.env.SEPOLIA_RPC_URL;

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
		delete process.env.SEPOLIA_RPC_URL;
		delete process.env.NOTIFICATIONS_SECRET;
		delete process.env.CRON_SECRET;

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

	function requestWithHeaders(headers: HeadersInit): Pick<Request, "headers"> {
		return { headers: new Headers(headers) };
	}

	it("rejects unauthenticated operational health requests", () => {
		expect(isAuthorizedHealthRequest(requestWithHeaders({}))).toBe(false);
	});

	it("allows bearer-authenticated operational health requests", () => {
		expect(
			isAuthorizedHealthRequest(
				requestWithHeaders({
					authorization: "Bearer health-token",
				}),
			),
		).toBe(true);
	});

	it("allows allowlisted operational health IPs", () => {
		process.env.HEALTH_CHECK_ALLOWED_IPS = "203.0.113.10, 2001:db8::10";

		expect(
			isAuthorizedHealthRequest(requestWithHeaders({ "x-forwarded-for": "203.0.113.10" })),
		).toBe(true);
	});

	it("allows loopback operational health requests", () => {
		expect(
			isAuthorizedHealthRequest(requestWithHeaders({ "x-forwarded-for": "127.0.0.1" })),
		).toBe(true);
	});

	it("keeps runtime health public through the runtime report", () => {
		const report = buildRuntimeHealthReport();

		expect(report.ok).toBe(true);
		expect(report.checks).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: "runtime" })]),
		);
	});
});
