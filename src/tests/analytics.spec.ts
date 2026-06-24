import { expect, test } from "@playwright/test";

// Wallet analytics is wallet-scoped: while disconnected the route renders the
// shared wallet-required gate (WalletRequiredPage), not the analytics summaries.
test.describe("analytics flow (disconnected)", () => {
	test("renders the wallet-required gate while disconnected", async ({ page }) => {
		await page.goto("/en/analytics");

		await expect(page.getByRole("banner")).toBeVisible();
		await expect(page.locator("main")).toBeVisible();
		await expect(
			page.getByRole("heading", {
				level: 1,
				name: /wallet connection required/i,
			}),
		).toBeVisible();
	});

	test("offers a connect control inside the analytics gate", async ({ page }) => {
		await page.goto("/en/analytics");

		await expect(
			page.locator("main").getByRole("button", { name: /connect wallet/i }),
		).toBeVisible();
	});

	// WCAG coverage for the disconnected gate lives in accessibility.spec.ts,
	// which already exercises the shared WalletRequiredPage across gated routes.
});

// Connected coverage runs against the env-gated mock wallet build
// (NEXT_PUBLIC_E2E_MOCK_WALLET=1); see `npm run test:e2e:wallet`. Contract reads
// stay disabled (zero-address deployments), so this verifies the connected
// analytics shell renders rather than the gate.
test.describe("analytics flow (connected)", { tag: "@wallet" }, () => {
	test("renders the wallet-scoped analytics shell when connected", async ({ page }) => {
		await page.goto("/en/analytics");

		await expect(
			page.getByRole("heading", {
				level: 1,
				name: /privacy-safe wallet analytics/i,
			}),
		).toBeVisible();
	});
});
