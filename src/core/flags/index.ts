/**
 * Feature flags.
 *
 * Defaults live in code; each can be overridden by a `NEXT_PUBLIC_FLAG_<NAME>`
 * env var (`"true"`/`"false"`) and, at runtime, by {@link setFlagOverride}
 * (useful for tests and QA toggles). Resolution order: runtime override → env →
 * default.
 */

import type { FeatureFlagSource } from "@/core/contracts";

/** Known feature flags and their built-in defaults. */
export const FLAG_DEFAULTS = {
	stakingEnabled: true,
	stakingSolEnabled: true,
	analyticsDashboards: true,
	adminAnalytics: true,
} as const;

/** Union of all valid runtime feature flag names derived from `FLAG_DEFAULTS`. */
export type FlagName = keyof typeof FLAG_DEFAULTS;

const overrides = new Map<FlagName, boolean>();

function envOverride(flag: FlagName): boolean | undefined {
	const key = `NEXT_PUBLIC_FLAG_${flag.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
	const raw = process.env[key];
	if (raw === "true") return true;
	if (raw === "false") return false;
	return undefined;
}

/** Resolve a flag's current state. */
export function isEnabled(flag: FlagName): boolean {
	return overrides.get(flag) ?? envOverride(flag) ?? FLAG_DEFAULTS[flag];
}

/** Force a flag on/off at runtime. */
export function setFlagOverride(flag: FlagName, value: boolean): void {
	overrides.set(flag, value);
}

/** Clear all runtime overrides (restores env/default resolution). */
export function clearFlagOverrides(): void {
	overrides.clear();
}

/** {@link FeatureFlagSource} view over the flag registry. */
export const featureFlags: FeatureFlagSource = {
	isEnabled(key: string): boolean {
		return key in FLAG_DEFAULTS ? isEnabled(key as FlagName) : false;
	},
};
