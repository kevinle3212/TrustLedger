import {
	fetchOracleRate,
	isOracleAsset,
	isOracleQuote,
	resetOracleCacheForTests,
} from "@/services/oracle";

describe("oracle service", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		resetOracleCacheForTests();
		process.env.ORACLE_RATE_TTL_MS = "60000";
		delete process.env.ORACLE_PRICE_SOURCE_URL;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		delete process.env.ORACLE_RATE_TTL_MS;
		delete process.env.ORACLE_PRICE_SOURCE_URL;
	});

	it("validates supported symbols", () => {
		expect(isOracleAsset("eth")).toBe(true);
		expect(isOracleAsset("btc")).toBe(false);
		expect(isOracleQuote("usd")).toBe(true);
		expect(isOracleQuote("eur")).toBe(false);
	});

	it("fetches and caches a positive USD price", async () => {
		const fetchMock = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => await Promise.resolve({ ethereum: { usd: 2750.25 } }),
		});
		global.fetch = fetchMock;

		const first = await fetchOracleRate("eth", "usd");
		const second = await fetchOracleRate("eth", "usd");

		expect(first).toMatchObject({
			base: "eth",
			quote: "usd",
			price: 2750.25,
			source: "https://api.coingecko.com",
			stale: false,
		});
		expect(second).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns a stale cached rate when the provider fails after a successful read", async () => {
		const fetchMock = jest
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => await Promise.resolve({ "usd-coin": { usd: 1 } }),
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 503,
			});
		global.fetch = fetchMock;
		process.env.ORACLE_RATE_TTL_MS = "1";

		await fetchOracleRate("usdc", "usd");
		await new Promise((resolve) => setTimeout(resolve, 5));

		const stale = await fetchOracleRate("usdc", "usd");

		expect(stale.price).toBe(1);
		expect(stale.stale).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("rejects malformed provider payloads without a cached fallback", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => await Promise.resolve({ ethereum: { usd: 0 } }),
		});

		await expect(fetchOracleRate("eth", "usd")).rejects.toThrow(/positive usd price/);
	});
});
