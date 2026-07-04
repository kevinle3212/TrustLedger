import {
	createAccountChallenge,
	getAccountProfile,
	resetOffchainAccountsForTests,
	updateAccountProfile,
	verifyAccountSession,
} from "@/services/offchainAccounts";

jest.mock("server-only", () => ({}), { virtual: true });

// These tests exercise the in-memory fallback (DATABASE_URL unset), so no live
// database connection is required.
describe("off-chain accounts service", () => {
	beforeEach(() => {
		resetOffchainAccountsForTests();
	});

	it("creates wallet-scoped challenges without passwords", () => {
		const challenge = createAccountChallenge("0x1111111111111111111111111111111111111111");

		expect(challenge.walletAddress).toBe("0x1111111111111111111111111111111111111111");
		expect(challenge.message.purpose).toBe("Sign In To TrustLedger Off-Chain Services");
		expect(challenge.nonce).toHaveLength(36);
	});

	it("stores onboarding preferences by normalized wallet", async () => {
		const profile = await updateAccountProfile("0x1111111111111111111111111111111111111111", {
			displayName: "Kevin",
			onboardingComplete: true,
		});

		expect(profile.displayName).toBe("Kevin");
		expect(
			(await getAccountProfile("0x1111111111111111111111111111111111111111"))
				?.onboardingComplete,
		).toBe(true);
	});

	it("defaults inactivityTimeoutMs to null and round-trips an update", async () => {
		const wallet = "0x2222222222222222222222222222222222222222";
		expect((await getAccountProfile(wallet))?.inactivityTimeoutMs).toBeNull();

		const updated = await updateAccountProfile(wallet, { inactivityTimeoutMs: 300_000 });
		expect(updated.inactivityTimeoutMs).toBe(300_000);
		expect((await getAccountProfile(wallet))?.inactivityTimeoutMs).toBe(300_000);

		const cleared = await updateAccountProfile(wallet, { inactivityTimeoutMs: null });
		expect(cleared.inactivityTimeoutMs).toBeNull();
	});

	it("rejects missing session tokens", () => {
		expect(verifyAccountSession(null)).toBeNull();
	});
});
