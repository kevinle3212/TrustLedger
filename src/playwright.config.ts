import { defineConfig, devices } from "@playwright/test";

// Read the preferred dev-server port from the environment, defaulting to Next's port.
const PORT = process.env.PORT ?? "3000";
// Some managed sandboxes reject binding directly to 127.0.0.1. Binding through
// localhost keeps the server local while allowing the OS to choose the loopback
// family it permits. Override when a CI host requires a specific interface.
const WEB_SERVER_HOST = process.env.PLAYWRIGHT_WEB_SERVER_HOST ?? "localhost";
// Let CI or a developer point tests at an already-running deployment when needed.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${WEB_SERVER_HOST}:${PORT}`;
// Convert CI from an optional string into an explicit boolean for strict linting.
const isCi = process.env.CI !== undefined && process.env.CI !== "";
// Production E2E runs avoid noisy framework development warnings. Developers can
// opt back into `next dev` with PLAYWRIGHT_USE_DEV_SERVER=1 when debugging HMR.
const useDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === "1";
// CI builds the app immediately before E2E. Serving that production build keeps
// logs clean and catches production-only routing/static-generation regressions.
const webServerEnvPrefix = "env -u NO_COLOR";
const webServerCommand = useDevServer
	? `${webServerEnvPrefix} npm run dev:frontend -- --hostname ${WEB_SERVER_HOST} --port ${PORT}`
	: `${webServerEnvPrefix} npm run start:e2e:standalone -- --hostname ${WEB_SERVER_HOST} --port ${PORT}`;

// Export the Playwright Test configuration consumed by `npm run test:e2e`.
export default defineConfig({
	// Keep E2E specs isolated from app and component source files.
	testDir: "./tests",
	// Jest owns component/unit tests under tests/unit.
	testIgnore: ["**/unit/**"],
	// Allow independent spec files to run in parallel when workers permit it.
	fullyParallel: true,
	// Fail CI if a committed test accidentally contains `test.only`.
	forbidOnly: isCi,
	// Retry transient browser failures in CI, but fail fast during local development.
	retries: isCi ? 2 : 0,
	// Serialize tests because Next dev route generation and Web3 providers are noisy under parallel load.
	workers: 1,
	// Use compact CI output while preserving an HTML report for local debugging.
	reporter: isCi ? [["dot"], ["html", { open: "never" }]] : "html",
	// Shared browser settings applied to every project below.
	use: {
		// Resolve relative `page.goto("/en")` calls against the local app.
		baseURL: BASE_URL,
		// Capture a trace only when a retry is needed, keeping passing runs lightweight.
		trace: "on-first-retry",
	},

	// Browser/device matrix for desktop and mobile responsive coverage.
	projects: [
		{
			// Desktop Chromium covers the primary development and CI browser.
			name: "chromium",
			// Start from Playwright's Desktop Chrome defaults, then use a wide viewport.
			use: {
				// Reuse Playwright's standard desktop Chromium user agent and device settings.
				...devices["Desktop Chrome"],
				// Match a common desktop width for layout regression checks.
				viewport: { width: 1440, height: 1000 },
			},
		},
		{
			// Mobile Chromium catches single-column layout regressions.
			name: "mobile-chrome",
			// Pixel 7 is a modern Android viewport with realistic touch/mobile defaults.
			use: { ...devices["Pixel 7"] },
		},
	],

	// Start the local app automatically before the E2E suite runs.
	webServer: {
		// Bind explicitly to loopback so sandboxed/local runs do not expose the server.
		command: webServerCommand,
		// Poll this URL until the app is ready before launching browser tests.
		url: BASE_URL,
		// Reuse a developer's already-running server locally; CI always starts fresh.
		reuseExistingServer: !isCi,
		// Give Next enough time for first-run compilation on slower machines.
		timeout: 120_000,
	},
});
