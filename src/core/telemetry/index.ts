/**
 * Lightweight performance telemetry.
 *
 * Wraps `performance.now()` (with a `Date.now()` fallback) to time spans and
 * report durations through the core logger. Deliberately tiny — it is a hook for
 * a richer APM later, not a replacement for one.
 */

import { logger } from "@/core/logging";

function clockNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** A running measurement. Call {@link Span.end} to record it. */
export interface Span {
	/** End the span and return its duration in milliseconds. */
	end: (extra?: Record<string, unknown>) => number;
}

/** Begin timing a named operation. */
export function startSpan(name: string, context?: Record<string, unknown>): Span {
	const start = clockNow();
	return {
		end(extra?: Record<string, unknown>): number {
			const durationMs = Math.round((clockNow() - start) * 100) / 100;
			logger.debug(`span:${name}`, { durationMs, ...context, ...extra });
			return durationMs;
		},
	};
}

/** Time an async function, recording a span around it (even on throw). */
export async function measure<R>(
	name: string,
	fn: () => Promise<R>,
	context?: Record<string, unknown>,
): Promise<R> {
	const span = startSpan(name, context);
	try {
		return await fn();
	} finally {
		span.end();
	}
}
