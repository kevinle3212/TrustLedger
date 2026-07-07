import { generateSync } from "otplib";
import { privateKeyToAccount } from "viem/accounts";

import {
	createAccountChallenge,
	createAccountSession,
	getAccountProfile,
	resetOffchainAccountsForTests,
	updateAccountProfile,
	verifyAccountSession,
} from "@/services/offchainAccounts";
import { beginSetup, confirmSetup, resetTotpForTests } from "@/services/totp";

jest.mock("server-only", () => ({}), { virtual: true });

// A deterministic test signer so createAccountSession sees a real signature.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);

/** Issues a challenge for the test account and signs it, returning the signature. */
async function signChallenge(): Promise<`0x${string}`> {
	const challenge = await createAccountChallenge(account.address);
	return await account.signTypedData({
		domain: challenge.domain,
		types: challenge.types,
		primaryType: "TrustLedgerSignIn",
		message: challenge.message,
	});
}

// These tests exercise the in-memory fallback (DATABASE_URL unset), so no live
// database connection is required.
describe("off-chain accounts service", () => {
	beforeEach(() => {
		resetOffchainAccountsForTests();
	});

	it("creates wallet-scoped challenges without passwords", async () => {
		const challenge = await createAccountChallenge(
			"0x1111111111111111111111111111111111111111",
		);

		expect(challenge.walletAddress).toBe("0x1111111111111111111111111111111111111111");
		expect(challenge.message.purpose).toBe("Sign In To TrustLedger Off-Chain Services");
		expect(challenge.domain.chainId).toBe(11155111);
		expect(challenge.domain.verifyingContract).toMatch(/^0x[a-fA-F0-9]{40}$/);
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

	describe("TOTP session step-up", () => {
		beforeEach(() => {
			resetTotpForTests();
		});

		it("issues a session without a code when 2FA is disabled", async () => {
			const token = await createAccountSession({
				walletAddress: account.address,
				signature: await signChallenge(),
			});
			expect(verifyAccountSession(token)?.walletAddress).toBe(account.address.toLowerCase());
		});

		it("requires a code once 2FA is enabled", async () => {
			const { secret } = await beginSetup(account.address);
			await confirmSetup(account.address, generateSync({ strategy: "totp", secret }));

			await expect(
				createAccountSession({
					walletAddress: account.address,
					signature: await signChallenge(),
				}),
			).rejects.toThrow("TOTP_REQUIRED");

			const token = await createAccountSession({
				walletAddress: account.address,
				signature: await signChallenge(),
				totpCode: generateSync({ strategy: "totp", secret }),
			});
			expect(verifyAccountSession(token)?.walletAddress).toBe(account.address.toLowerCase());
		});
	});
});
