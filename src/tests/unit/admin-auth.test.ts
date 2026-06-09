import {
	adminCookieHeader,
	adminSessionFromHeaders,
	authenticateAdminCredentials,
	isAdminIpAllowed,
	isAuthorizedAdminRequest,
} from "@/services/adminAuth";
import { buildAdminDashboardReport } from "@/services/adminReport";

const TEST_PASSWORD_HASH =
	"pbkdf2_sha256$310000$test-admin-salt$RBv0OeyMb_VtTX8Shs-InHsZn3A5TsKLELxmFDYyLFs";

describe("admin auth", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = {
			...originalEnv,
			ADMIN_SESSION_SECRET: "test-session-secret-that-is-long-enough",
			ADMIN_BOOTSTRAP_EMAIL: "owner@example.com",
			ADMIN_BOOTSTRAP_USERNAME: "owner-admin",
			ADMIN_BOOTSTRAP_PASSWORD_HASH: TEST_PASSWORD_HASH,
		};
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("authenticates bootstrap credentials and signs a session cookie", () => {
		const session = authenticateAdminCredentials({
			usernameOrEmail: "owner-admin",
			password: "secure-admin-password",
		});

		expect(session?.email).toBe("owner@example.com");
		if (session === undefined) throw new Error("expected admin session");
		const cookie = adminCookieHeader(session);
		expect(adminSessionFromHeaders(new Headers({ cookie }))?.username).toBe("owner-admin");
	});

	it("rejects invalid bootstrap credentials", () => {
		expect(
			authenticateAdminCredentials({
				usernameOrEmail: "owner-admin",
				password: "wrong-password",
			}),
		).toBeUndefined();
	});

	it("enforces the admin IP allowlist when configured", () => {
		process.env["ADMIN_ALLOWED_IPS"] = "203.0.113.10";

		expect(isAdminIpAllowed(new Headers({ "x-forwarded-for": "203.0.113.10" }))).toBe(true);
		expect(isAdminIpAllowed(new Headers({ "x-forwarded-for": "198.51.100.4" }))).toBe(false);
	});

	it("rejects admin requests without a session or bearer token", () => {
		expect(isAuthorizedAdminRequest(new Headers())).toBe(false);
	});
});

describe("admin report", () => {
	it("builds a read-only operator report with required sections", () => {
		const report = buildAdminDashboardReport();

		expect(report.readOnly).toBe(true);
		expect(report.sections.map((section) => section.title)).toEqual(
			expect.arrayContaining([
				"Operational health",
				"Contract and dispute lookup",
				"Jurors and reputation",
				"Notifications and cron",
				"Oracle freshness",
				"Security reports and deployment",
				"Rate limits and audit logs",
			]),
		);
	});
});
