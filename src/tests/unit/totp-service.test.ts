import { generateSync } from "otplib";

import {
	beginSetup,
	confirmSetup,
	disable,
	isEnabled,
	resetTotpForTests,
	verify,
} from "@/services/totp";

jest.mock("server-only", () => ({}), { virtual: true });

const wallet = "0xDDDD000000000000000000000000000000000004";

// Exercises the in-memory fallback (DATABASE_URL unset).
describe("totp service", () => {
	beforeEach(() => {
		resetTotpForTests();
	});

	it("enables 2FA after a correct setup code and returns recovery codes", async () => {
		const { secret } = await beginSetup(wallet);
		expect(await isEnabled(wallet)).toBe(false);

		const token = generateSync({ strategy: "totp", secret });
		const recoveryCodes = await confirmSetup(wallet, token);

		expect(recoveryCodes).toHaveLength(10);
		expect(await isEnabled(wallet)).toBe(true);
	});

	it("rejects an incorrect setup code", async () => {
		await beginSetup(wallet);
		await expect(confirmSetup(wallet, "000000")).rejects.toThrow("Invalid two-factor code.");
		expect(await isEnabled(wallet)).toBe(false);
	});

	it("consumes a recovery code exactly once", async () => {
		const { secret } = await beginSetup(wallet);
		const codes = await confirmSetup(wallet, generateSync({ strategy: "totp", secret }));
		const recovery = codes[0] ?? "";

		expect(await verify(wallet, recovery)).toBe(true);
		expect(await verify(wallet, recovery)).toBe(false);
	});

	it("disables 2FA with a valid code", async () => {
		const { secret } = await beginSetup(wallet);
		await confirmSetup(wallet, generateSync({ strategy: "totp", secret }));

		await disable(wallet, generateSync({ strategy: "totp", secret }));
		expect(await isEnabled(wallet)).toBe(false);
	});
});
