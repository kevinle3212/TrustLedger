import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
	"/en",
	"/en/create",
	"/en/dashboard",
	"/en/juror",
	"/en/reputation",
	"/en/faq",
	"/en/legal",
];

test.describe("public route accessibility", () => {
	for (const route of routes) {
		test(`${route} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
			await page.goto(route);
			await expect(page.getByRole("banner")).toBeVisible();

			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();

			expect(results.violations).toEqual([]);
		});
	}
});
