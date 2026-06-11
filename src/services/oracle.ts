import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

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

export interface OraclePair {
	readonly base: OracleAsset;
	readonly quote: OracleQuote;
	readonly providerId: string;
}

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

export function isOracleAsset(value: string): value is OracleAsset {
	return Object.hasOwn(ASSET_IDS, value);
}

export function isOracleQuote(value: string): value is OracleQuote {
	return value === "usd";
}

export function resetOracleCacheForTests(): void {
	cache = undefined;
}

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
