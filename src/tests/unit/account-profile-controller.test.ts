import * as accounts from "@/services/offchainAccounts";
import type { AccountProfile, AccountSession } from "@/services/offchainAccounts";
import { patchProfile } from "@/controllers/accountProfileController";

jest.mock("server-only", () => ({}), { virtual: true });

// Keep the real (in-memory, DATABASE_URL-unset) account store but stub session
// verification so we can drive the controller without signing a challenge.
jest.mock("@/services/offchainAccounts", () => {
	const actual = jest.requireActual<typeof accounts>("@/services/offchainAccounts");
	return { ...actual, verifyAccountSession: jest.fn() };
});

const session: AccountSession = {
	walletAddress: "0x3333333333333333333333333333333333333333",
	issuedAt: 0,
	expiresAt: Date.now() + 60_000,
};

function profileOf(body: unknown): AccountProfile {
	return (body as { profile: AccountProfile }).profile;
}

describe("account profile controller PATCH validation", () => {
	beforeEach(() => {
		accounts.resetOffchainAccountsForTests();
		(accounts.verifyAccountSession as jest.Mock).mockReturnValue(session);
	});

	it("accepts a valid inactivityTimeoutMs", async () => {
		const res = await patchProfile("token", { inactivityTimeoutMs: 300_000 });
		expect(res.status).toBe(200);
		expect(profileOf(res.body).inactivityTimeoutMs).toBe(300_000);
	});

	it("accepts null inactivityTimeoutMs (use app default)", async () => {
		const res = await patchProfile("token", { inactivityTimeoutMs: null });
		expect(res.status).toBe(200);
		expect(profileOf(res.body).inactivityTimeoutMs).toBeNull();
	});

	it("rejects an out-of-range inactivityTimeoutMs", async () => {
		expect((await patchProfile("token", { inactivityTimeoutMs: 1_000 })).status).toBe(400);
		expect((await patchProfile("token", { inactivityTimeoutMs: 90_000_000 })).status).toBe(400);
	});

	it("rejects a non-integer inactivityTimeoutMs", async () => {
		const res = await patchProfile("token", { inactivityTimeoutMs: 300_000.5 });
		expect(res.status).toBe(400);
		expect((res.body as { error: string }).error).toBe("invalid inactivityTimeoutMs");
	});

	it("rejects a mistyped displayName", async () => {
		const res = await patchProfile("token", { displayName: 42 });
		expect(res.status).toBe(400);
	});
});
