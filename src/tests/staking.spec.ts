import { expect, test } from "@playwright/test";

// Juror staking (register, top up, unstake) is gated behind a connected wallet
// and the JurorRegistry contract. While disconnected the /juror route renders
// the shared wallet-required gate (WalletRequiredPage).
test.describe("staking flow (disconnected)", () => {
	test("renders the wallet-required gate while disconnected", async ({ page }) => {
		await page.goto("/en/juror");

		await expect(page.getByRole("banner")).toBeVisible();
		await expect(page.locator("main")).toBeVisible();
		await expect(
			page.getByRole("heading", {
				level: 1,
				name: /wallet connection required/i,
			}),
		).toBeVisible();
	});

	test("offers a connect control before managing stake", async ({ page }) => {
		await page.goto("/en/juror");

		await expect(
			page.locator("main").getByRole("button", { name: /connect wallet/i }),
		).toBeVisible();
	});

	// WCAG coverage for the disconnected gate lives in accessibility.spec.ts,
	// which already exercises the shared WalletRequiredPage across gated routes.
});

// Connected coverage runs against the env-gated mock wallet build
// (NEXT_PUBLIC_E2E_MOCK_WALLET=1); see `npm run test:e2e:wallet`. Contract reads
// stay disabled (zero-address deployments), so this verifies the staking panel
// and its client-side stake validation. The on-chain register/unstake
// settlement is covered by the Foundry and Hardhat contract suites.
test.describe("staking flow (connected)", { tag: "@wallet" }, () => {
	test("renders the juror staking panel when connected", async ({ page }) => {
		await page.goto("/en/juror");

		await expect(page.getByRole("heading", { level: 1, name: /juror panel/i })).toBeVisible();
		await expect(page.getByLabel(/stake amount in eth/i)).toBeVisible();
	});

	test("rejects a stake below the minimum and keeps register disabled", async ({ page }) => {
		await page.goto("/en/juror");

		const stakeInput = page.getByLabel(/stake amount in eth/i);
		await stakeInput.fill("0.005");
		await stakeInput.blur();

		await expect(page.getByText(/minimum is 0\.01 eth/i)).toBeVisible();
		await expect(page.getByRole("button", { name: /^register$/i })).toBeDisabled();
	});

	test("accepts a valid minimum stake and enables register", async ({ page }) => {
		await page.goto("/en/juror");

		const stakeInput = page.getByLabel(/stake amount in eth/i);
		await stakeInput.fill("0.05");
		await stakeInput.blur();

		await expect(page.getByText(/minimum is 0\.01 eth/i)).toHaveCount(0);
		await expect(page.getByRole("button", { name: /^register$/i })).toBeEnabled();
	});
});
