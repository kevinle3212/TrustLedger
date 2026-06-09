export interface HealthCheck {
	readonly name: string;
	readonly ok: boolean;
	readonly detail: string;
}

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
		checkPublicAppUrl(),
	];

	return {
		ok: checks.every((check) => check.ok),
		checkedAt: new Date().toISOString(),
		checks,
	};
}
