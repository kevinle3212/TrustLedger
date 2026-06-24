import { expect, test } from "@playwright/test";

// The navbar shows a "Connect Wallet" control while disconnected and swaps to
// ConnectedWalletMenu (truncated address, copy button, wallet-safe links) once
// connected.
test.describe("wallet menu flow (disconnected)", () => {
	test("exposes a connect control in the navbar", async ({ page }) => {
		await page.goto("/en");

		const banner = page.getByRole("banner");
		await expect(banner).toBeVisible();
		await expect(banner.getByRole("button", { name: /connect wallet/i })).toBeVisible();
	});
});

// Connected coverage runs against the env-gated mock wallet build
// (NEXT_PUBLIC_E2E_MOCK_WALLET=1); see `npm run test:e2e:wallet`. Restricted to
// chromium for stable hover/menu and clipboard behavior.
test.describe("wallet menu flow (connected)", { tag: "@wallet" }, () => {
	test.use({ permissions: ["clipboard-write"] });

	test("opens the connected wallet menu and copies the address", async ({ page }) => {
		await page.goto("/en");

		const banner = page.getByRole("banner");
		const trigger = banner.getByRole("button", { name: /connected as/i });
		await expect(trigger).toBeVisible();

		await trigger.click();
		const menu = page.getByRole("menu", { name: /wallet menu/i });
		await expect(menu).toBeVisible();
		await expect(menu.getByRole("menuitem", { name: /dashboard/i })).toBeVisible();

		await banner.getByRole("button", { name: /copy wallet address/i }).click();
		await expect(banner.getByRole("button", { name: /address copied/i })).toBeVisible();
	});

	test("navigates to a wallet-safe route from the menu", async ({ page }) => {
		await page.goto("/en");

		const banner = page.getByRole("banner");
		// The menu is hover-intent with a short close delay, so keep the pointer
		// on the trigger then the item (mirrors a real user) rather than jumping
		// across the gap, which would let the close timer fire mid-click.
		await banner.getByRole("button", { name: /connected as/i }).hover();

		const menu = page.getByRole("menu", { name: /wallet menu/i });
		await expect(menu).toBeVisible();

		const dashboardItem = menu.getByRole("menuitem", { name: /dashboard/i });
		await dashboardItem.hover();
		await dashboardItem.click();

		await expect(page).toHaveURL(/\/en\/dashboard$/);
	});
});
