/**
 * Service contracts (interfaces) for the TrustLedger core layer.
 *
 * These are the seams every other core module is written against, so concrete
 * implementations (console logger, in-memory cache, HTTP analytics sink, …) can
 * be swapped in tests or per environment without touching call sites.
 */

/** Severity levels, ordered low → high. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured key/value context attached to a log line or event. */
export type LogContext = Record<string, unknown>;

/** Minimal structured logger. */
export interface Logger {
	debug: (message: string, context?: LogContext) => void;
	info: (message: string, context?: LogContext) => void;
	warn: (message: string, context?: LogContext) => void;
	error: (message: string, context?: LogContext) => void;
	/** Returns a logger that merges `context` into every line it emits. */
	child: (context: LogContext) => Logger;
}

/** A single analytics event. */
export interface AnalyticsEvent {
	readonly name: string;
	readonly properties?: Record<string, unknown> | undefined;
	readonly timestamp: number;
}

/** Destination for analytics events (HTTP endpoint, console, buffer, …). */
export interface AnalyticsSink {
	send: (event: AnalyticsEvent) => void | Promise<void>;
}

/** Generic key/value cache with per-entry expiry. */
export interface CacheStore<V = unknown> {
	get: (key: string) => V | undefined;
	set: (key: string, value: V, ttlMs?: number) => void;
	has: (key: string) => boolean;
	delete: (key: string) => boolean;
	clear: () => void;
}

/** Resolves feature-flag state by key. */
export interface FeatureFlagSource {
	isEnabled: (key: string) => boolean;
}

/** Injectable clock — keeps time-dependent code testable. */
export interface Clock {
	now: () => number;
}

/** The real wall clock. */
export const systemClock: Clock = {
	now(): number {
		return Date.now();
	},
};
