import {
	createAccountChallenge,
	getAccountProfile,
	resetOffchainAccountsForTests,
	updateAccountProfile,
	verifyAccountSession,
} from "@/services/offchainAccounts";

jest.mock("server-only", () => ({}), { virtual: true });

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

	it("stores onboarding preferences by normalized wallet", () => {
		const profile = updateAccountProfile("0x1111111111111111111111111111111111111111", {
			displayName: "Kevin",
			onboardingComplete: true,
		});

		expect(profile.displayName).toBe("Kevin");
		expect(
			getAccountProfile("0x1111111111111111111111111111111111111111")?.onboardingComplete,
		).toBe(true);
	});

	it("rejects missing session tokens", () => {
		expect(verifyAccountSession(null)).toBeNull();
	});
});
