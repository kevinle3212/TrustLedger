/**
 * Centralised, typed access to runtime configuration.
 *
 * Reads from `process.env` once and exposes a frozen, validated view. Only
 * `NEXT_PUBLIC_*` values are safe on the client; server-only secrets are read
 * lazily through {@link serverConfig} so they never leak into a client bundle.
 */

import type { LogLevel } from "@/core/contracts";

/** True when running in the browser. */
export const isBrowser = typeof window !== "undefined";

function readEnv(key: string): string | undefined {
	const value = process.env[key];
	return value === undefined || value === "" ? undefined : value;
}

function readLogLevel(): LogLevel {
	const raw = readEnv("NEXT_PUBLIC_LOG_LEVEL")?.toLowerCase();
	if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
		return raw;
	}
	return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

/** Deployment environment. */
export type AppEnv = "development" | "production" | "test";

function readAppEnv(): AppEnv {
	const node = process.env.NODE_ENV;
	if (node === "production" || node === "test") return node;
	return "development";
}

/** Client-safe configuration (also readable on the server). */
export interface PublicConfig {
	readonly appEnv: AppEnv;
	readonly isProduction: boolean;
	readonly logLevel: LogLevel;
	readonly githubUrl: string | undefined;
	readonly analyticsEndpoint: string;
	readonly analyticsEnabled: boolean;
}

export const config: PublicConfig = Object.freeze({
	appEnv: readAppEnv(),
	isProduction: process.env.NODE_ENV === "production",
	logLevel: readLogLevel(),
	githubUrl: readEnv("NEXT_PUBLIC_GITHUB_URL"),
	analyticsEndpoint: readEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT") ?? "/api/analytics/events",
	analyticsEnabled: readEnv("NEXT_PUBLIC_ANALYTICS_DISABLED") !== "true",
});

/**
 * Server-only configuration. Throws if read in the browser so a missing guard
 * surfaces immediately instead of silently shipping a secret to the client.
 */
export function serverConfig(): { readonly adminApiToken: string | undefined } {
	if (isBrowser) {
		throw new Error("serverConfig() must not be read in the browser");
	}
	return { adminApiToken: readEnv("ADMIN_API_TOKEN") };
}
