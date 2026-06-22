/**
 * Reusable in-memory fixed-window rate limiter.
 *
 * Best-effort by design: on serverless / Fluid Compute the counter map lives per
 * instance, so it caps obvious bursts rather than enforcing a global quota. A
 * shared store (Upstash/Redis) is the upgrade path once a stateful backend
 * exists. Used by the routing proxy (`src/proxy.ts`) for `/api/*` and available
 * to any handler that needs the same primitive.
 */

/** A fixed-window limiter keyed by an arbitrary string (e.g. client IP). */
export interface RateLimiter {
	/** Records a hit for `key`; returns `true` when the window quota is exceeded. */
	check: (key: string) => boolean;
}

/**
 * Creates a fixed-window limiter allowing `limit` hits per `windowMs` per key.
 *
 * Example:
 *   const limiter = createRateLimiter(30, 60_000); // 30 req/min/key
 *   if (limiter.check(ip)) return tooManyRequests();
 */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
	const hits = new Map<string, { count: number; resetAt: number }>();
	return {
		check(key: string): boolean {
			const now = Date.now();
			const entry = hits.get(key);
			if (entry === undefined || now > entry.resetAt) {
				hits.set(key, { count: 1, resetAt: now + windowMs });
				return false;
			}
			entry.count++;
			return entry.count > limit;
		},
	};
}
