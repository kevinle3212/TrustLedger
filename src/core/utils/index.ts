/**
 * Small, dependency-free shared utilities used across core modules and the app.
 * Domain formatting helpers continue to live in `@/lib/utils`; this is for
 * generic, framework-agnostic helpers.
 */

/** Resolve after `ms` milliseconds. */
export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Truncate the middle of a long string, keeping the ends (e.g. addresses). */
export function truncateMiddle(value: string, lead = 6, tail = 4): string {
	if (value.length <= lead + tail + 1) return value;
	return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/** Parse JSON, returning `fallback` instead of throwing on invalid input. */
export function safeJsonParse<T>(raw: string, fallback: T): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

/** Sum a list of bigints. */
export function sumBigInt(values: readonly bigint[]): bigint {
	return values.reduce((total, value) => total + value, 0n);
}
