import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

/** A single price rate fetched from the oracle source (CoinGecko or a configured override). */
export interface OracleRate {
	readonly base: OracleAsset;
	readonly quote: OracleQuote;
	readonly price: number;
	readonly fetchedAt: string;
	readonly source: string;
	readonly stale: boolean;
}

export type OracleAsset = "eth" | "usdc";
export type OracleQuote = "usd";

/** A supported asset/quote trading pair for the oracle. */
export interface OraclePair {
	readonly base: OracleAsset;
	readonly quote: OracleQuote;
	readonly providerId: string;
}

/** Runtime configuration and cache state returned by `GET /api/oracle/status`. */
export interface OracleStatus {
	readonly source: string;
	readonly ttlMs: number;
	readonly maxTtlMs: number;
	readonly supportedPairs: readonly OraclePair[];
	readonly cache: {
		readonly populated: boolean;
		readonly base: OracleAsset | null;
		readonly quote: OracleQuote | null;
		readonly expiresAt: string | null;
	};
}

interface CachedRate {
	readonly rate: OracleRate;
	readonly expiresAtMs: number;
}

const ASSET_IDS: Record<OracleAsset, string> = {
	eth: "ethereum",
	usdc: "usd-coin",
};

export const DEFAULT_ORACLE_SOURCE_URL = "https://api.coingecko.com/api/v3/simple/price";
const DEFAULT_TTL_MS = 60_000;
const MAX_TTL_MS = 3_600_000;

let cache: CachedRate | undefined;

function readTtlMs(): number {
	const raw = process.env.ORACLE_RATE_TTL_MS;
	if (raw === undefined || raw === "") return DEFAULT_TTL_MS;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_TTL_MS;
	return Math.min(parsed, MAX_TTL_MS);
}

function buildOracleUrl(base: OracleAsset, quote: OracleQuote): URL {
	const url = new URL(process.env.ORACLE_PRICE_SOURCE_URL ?? DEFAULT_ORACLE_SOURCE_URL);
	url.searchParams.set("ids", ASSET_IDS[base]);
	url.searchParams.set("vs_currencies", quote);
	return url;
}

function parseRatePayload(
	payload: unknown,
	base: OracleAsset,
	quote: OracleQuote,
	source: string,
): OracleRate {
	if (typeof payload !== "object" || payload === null) {
		throw new Error("oracle payload must be an object");
	}

	const assetPayload = (payload as Record<string, unknown>)[ASSET_IDS[base]];
	if (typeof assetPayload !== "object" || assetPayload === null) {
		throw new Error(`oracle payload missing ${ASSET_IDS[base]}`);
	}

	const price = (assetPayload as Record<string, unknown>)[quote];
	if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
		throw new Error(`oracle payload missing positive ${quote} price`);
	}

	return {
		base,
		quote,
		price,
		fetchedAt: new Date().toISOString(),
		source,
		stale: false,
	};
}

/**
 * Type guard for the supported oracle base asset allowlist.
 *
 * @param value - Candidate asset symbol.
 * @returns `true` when `value` is a supported {@link OracleAsset}.
 */
export function isOracleAsset(value: string): value is OracleAsset {
	return Object.hasOwn(ASSET_IDS, value);
}

/**
 * Type guard for the supported oracle quote-currency allowlist.
 *
 * @param value - Candidate quote symbol.
 * @returns `true` when `value` is a supported {@link OracleQuote}.
 */
export function isOracleQuote(value: string): value is OracleQuote {
	return value === "usd";
}

/**
 * Clears the in-memory oracle rate cache. Test-only helper for deterministic
 * fetch behavior between cases.
 */
export function resetOracleCacheForTests(): void {
	cache = undefined;
}

/**
 * Returns public oracle metadata (provider shape, supported pairs, TTL, cache
 * state). Performs no provider fetch and never exposes credentials.
 *
 * @returns The current {@link OracleStatus}.
 */
export function getOracleStatus(): OracleStatus {
	const source = process.env.ORACLE_PRICE_SOURCE_URL ?? DEFAULT_ORACLE_SOURCE_URL;
	return {
		source,
		ttlMs: readTtlMs(),
		maxTtlMs: MAX_TTL_MS,
		supportedPairs: Object.entries(ASSET_IDS).map(([base, providerId]) => ({
			base: base as OracleAsset,
			quote: "usd",
			providerId,
		})),
		cache: {
			populated: cache !== undefined,
			base: cache?.rate.base ?? null,
			quote: cache?.rate.quote ?? null,
			expiresAt: cache === undefined ? null : new Date(cache.expiresAtMs).toISOString(),
		},
	};
}

/**
 * Fetches an exchange rate from the configured provider, serving a brief
 * server-side cache when warm and marking provider-failure fallbacks as stale.
 *
 * @param base - Supported base asset (for example `eth`).
 * @param quote - Supported quote currency (for example `usd`).
 * @returns The resolved {@link OracleRate}.
 * @throws When the provider fetch fails and no usable value is available.
 */
export async function fetchOracleRate(base: OracleAsset, quote: OracleQuote): Promise<OracleRate> {
	const now = Date.now();
	if (cache?.rate.base === base && cache.expiresAtMs > now) {
		return cache.rate;
	}

	const url = buildOracleUrl(base, quote);
	try {
		const response = await fetchWithTimeout(
			url,
			{
				headers: { accept: "application/json" },
				cache: "no-store",
			},
			REQUEST_TIMEOUT_MS.oracle,
		);
		if (!response.ok) {
			throw new Error(`oracle source returned HTTP ${response.status.toString()}`);
		}

		const rate = parseRatePayload(await response.json(), base, quote, url.origin);
		cache = { rate, expiresAtMs: now + readTtlMs() };
		return rate;
	} catch (error) {
		if (cache?.rate.base === base) {
			return { ...cache.rate, stale: true };
		}
		throw error;
	}
}
