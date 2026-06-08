import { expect, test } from "@playwright/test";

const routes = ["/en", "/en/create", "/en/dashboard", "/en/juror", "/en/reputation"];

test.describe("public app routes", () => {
	for (const route of routes) {
		test(`${route} renders without horizontal overflow`, async ({ page }) => {
			await page.goto(route);

			await expect(page.getByRole("banner")).toBeVisible();
			await expect(page.locator("main")).toBeVisible();

			const hasHorizontalOverflow = await page.evaluate(() => {
				const root = document.documentElement;
				return root.scrollWidth > root.clientWidth + 1;
			});

			expect(hasHorizontalOverflow).toBe(false);
		});
	}
});

test("desktop reputation keeps the primary page width readable", async ({ page, isMobile }) => {
	test.skip(isMobile, "Desktop shell width is covered by the chromium project.");

	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto("/en/reputation");

	const shell = page.locator(".tl-app-shell").first();
	await expect(shell).toBeVisible();

	const box = await shell.boundingBox();
	expect(box?.width).toBeGreaterThan(900);
	expect(box?.width).toBeLessThanOrEqual(1280);
});
