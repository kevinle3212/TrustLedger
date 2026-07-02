import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
	"/en",
	"/en/about",
	"/en/analytics",
	"/en/create",
	"/en/dashboard",
	"/en/juror",
	"/en/reputation",
	"/en/faq",
	"/en/legal",
	"/en/stats",
	"/en/status",
];

test.describe("public route accessibility", () => {
	for (const route of routes) {
		test(`${route} has no automatically detectable WCAG A/AA violations`, async ({ page }) => {
			await page.goto(route);
			await expect(page.getByRole("banner")).toBeVisible();

			// Freeze entrance animations before analyzing. Elements such as the
			// cookie banner fade in from opacity 0; without this, axe can sample a
			// transient low-opacity frame and report a false color-contrast failure
			// even though the settled colors meet AA.
			await page.addStyleTag({
				content: "*,*::before,*::after{animation:none!important;transition:none!important}",
			});

			// Include the WCAG 2.2 AA tags so the gate also covers 2.2 success
			// criteria such as target-size (SC 2.5.8).
			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
				.analyze();

			expect(results.violations).toEqual([]);
		});
	}
});
