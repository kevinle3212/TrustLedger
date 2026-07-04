/** A single named health probe result used in the operational health report. */
export interface HealthCheck {
	readonly name: string;
	readonly ok: boolean;
	readonly detail: string;
}

/** Aggregated health report returned by `GET /api/health`. `ok` is `false` if any check fails. */
export interface HealthReport {
	readonly ok: boolean;
	readonly checkedAt: string;
	readonly checks: readonly HealthCheck[];
}

function hasEnv(name: string): boolean {
	const value = process.env[name];
	return value !== undefined && value !== "";
}

function checkPublicAppUrl(): HealthCheck {
	const value = process.env.NEXT_PUBLIC_APP_URL;
	if (value === undefined || value === "") {
		return {
			name: "app-url",
			ok: true,
			detail: "NEXT_PUBLIC_APP_URL is unset; localhost fallback will be used.",
		};
	}

	try {
		const url = new URL(value);
		return {
			name: "app-url",
			ok: url.protocol === "https:" || url.hostname === "localhost",
			detail: url.origin,
		};
	} catch {
		return {
			name: "app-url",
			ok: false,
			detail: "NEXT_PUBLIC_APP_URL is not a valid URL.",
		};
	}
}

function checkPrivacyAnalytics(): HealthCheck {
	const enabled = process.env.TRUSTLEDGER_ANALYTICS_ENABLED === "true";
	const publicEnabled = process.env.NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED === "true";
	return {
		name: "privacy-analytics",
		ok: enabled === publicEnabled,
		detail:
			enabled === publicEnabled
				? `Privacy analytics ${enabled ? "enabled" : "disabled"}.`
				: "TRUSTLEDGER_ANALYTICS_ENABLED and NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED disagree.",
	};
}

/**
 * Builds the runtime liveness report (process-level signals only) used by the
 * unauthenticated `/api/health/runtime` probe.
 *
 * @returns A {@link HealthReport} describing runtime health.
 */
export function buildRuntimeHealthReport(): HealthReport {
	return {
		ok: true,
		checkedAt: new Date().toISOString(),
		checks: [
			{
				name: "runtime",
				ok: true,
				detail: "Next.js API runtime is responding.",
			},
		],
	};
}

/**
 * Builds the full operational readiness report, checking configuration
 * *presence* (never values) for required integrations.
 *
 * @returns A {@link HealthReport}; `ok` is `false` when a required check fails.
 */
export function buildHealthReport(): HealthReport {
	const checks: HealthCheck[] = [
		...buildRuntimeHealthReport().checks,
		{
			name: "sepolia-rpc",
			ok: hasEnv("SEPOLIA_RPC_URL"),
			detail: hasEnv("SEPOLIA_RPC_URL")
				? "SEPOLIA_RPC_URL is configured."
				: "SEPOLIA_RPC_URL is missing; contract read APIs will fail.",
		},
		{
			name: "notifications-secret",
			ok: hasEnv("NOTIFICATIONS_SECRET"),
			detail: hasEnv("NOTIFICATIONS_SECRET")
				? "NOTIFICATIONS_SECRET is configured."
				: "NOTIFICATIONS_SECRET is missing; notification API is disabled.",
		},
		{
			name: "cron-secret",
			ok: hasEnv("CRON_SECRET"),
			detail: hasEnv("CRON_SECRET")
				? "CRON_SECRET is configured."
				: "CRON_SECRET is missing; deadline cron is disabled.",
		},
		{
			name: "oracle-source",
			ok: true,
			detail:
				process.env.ORACLE_PRICE_SOURCE_URL ??
				"https://api.coingecko.com/api/v3/simple/price",
		},
		checkPrivacyAnalytics(),
		checkPublicAppUrl(),
	];

	return {
		ok: checks.every((check) => check.ok),
		checkedAt: new Date().toISOString(),
		checks,
	};
}
