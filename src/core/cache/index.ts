/**
 * In-memory TTL cache with a bounded size (LRU-ish eviction of the oldest key).
 *
 * Suitable for memoising derived values and short-lived RPC/HTTP responses on
 * the client or within a single server invocation. Not a distributed cache.
 */

import { systemClock, type CacheStore, type Clock } from "@/core/contracts";

interface Entry<V> {
	value: V;
	expiresAt: number;
}

/**
 * In-memory TTL cache with LRU eviction.
 *
 * Entries expire after `defaultTtlMs` milliseconds (or a per-`set` override).
 * When `maxEntries` is reached the oldest entry is evicted before inserting the new one.
 */
export class TTLCache<V = unknown> implements CacheStore<V> {
	private readonly store = new Map<string, Entry<V>>();

	public constructor(
		private readonly defaultTtlMs = 60_000,
		private readonly maxEntries = 500,
		private readonly clock: Clock = systemClock,
	) {}

	public get(key: string): V | undefined {
		const entry = this.store.get(key);
		if (entry === undefined) return undefined;
		if (entry.expiresAt <= this.clock.now()) {
			this.store.delete(key);
			return undefined;
		}
		// Refresh recency for LRU eviction.
		this.store.delete(key);
		this.store.set(key, entry);
		return entry.value;
	}

	public set(key: string, value: V, ttlMs: number = this.defaultTtlMs): void {
		if (this.store.size >= this.maxEntries && !this.store.has(key)) {
			const oldest = this.store.keys().next().value;
			if (oldest !== undefined) this.store.delete(oldest);
		}
		this.store.set(key, { value, expiresAt: this.clock.now() + ttlMs });
	}

	public has(key: string): boolean {
		return this.get(key) !== undefined;
	}

	public delete(key: string): boolean {
		return this.store.delete(key);
	}

	public clear(): void {
		this.store.clear();
	}
}

/**
 * Wrap an async function so identical `key`s within `ttlMs` share one result
 * (in-flight promises included, to dedupe concurrent calls).
 */
export function memoizeAsync<A extends unknown[], R>(
	fn: (...args: A) => Promise<R>,
	keyOf: (...args: A) => string,
	ttlMs = 60_000,
): (...args: A) => Promise<R> {
	const cache = new TTLCache<Promise<R>>(ttlMs);
	return async (...args: A): Promise<R> => {
		const key = keyOf(...args);
		const existing = cache.get(key);
		if (existing !== undefined) return await existing;
		const promise = fn(...args).catch((error: unknown) => {
			cache.delete(key);
			throw error;
		});
		cache.set(key, promise, ttlMs);
		return await promise;
	};
}
