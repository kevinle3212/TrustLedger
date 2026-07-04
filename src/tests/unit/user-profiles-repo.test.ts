jest.mock("server-only", () => ({}), { virtual: true });

// Force the "database not configured" path so the repository never attempts a
// real connection. This exercises the fallback contract the deadline cron relies
// on: emailForWallet resolves to null and the caller uses the env map instead.
jest.mock("@/lib/db/client", () => ({
	isDatabaseConfigured: (): boolean => false,
	getPrisma: jest.fn((): never => {
		throw new Error("getPrisma should not be called when the database is unconfigured");
	}),
}));

import { emailForWallet } from "@/lib/db/repositories/userProfiles";

describe("userProfiles.emailForWallet", () => {
	it("returns null when the database is not configured", async () => {
		expect(await emailForWallet("0x4444444444444444444444444444444444444444")).toBeNull();
	});
});
