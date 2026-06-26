import {
	formatAssetAmount,
	getStakeAsset,
	listStakeAssets,
	parseAssetAmount,
	STAKE_ASSETS,
	validateStakeAmount,
} from "@/lib/staking/assets";

describe("staking asset registry", () => {
	it("uses correct decimals per asset (ETH 18 / USDC 6 / SOL 9)", () => {
		expect(STAKE_ASSETS.ETH.decimals).toBe(18);
		expect(STAKE_ASSETS.USDC.decimals).toBe(6);
		expect(STAKE_ASSETS.SOL.decimals).toBe(9);
	});

	it("exposes assets in display order", () => {
		expect(listStakeAssets().map((a) => a.id)).toEqual(["ETH", "USDC", "SOL"]);
	});

	it("resolves and rejects asset ids", () => {
		expect(getStakeAsset("USDC")?.symbol).toBe("USDC");
		expect(getStakeAsset("DOGE")).toBeUndefined();
	});
});

describe("parseAssetAmount", () => {
	it("parses each asset's decimals into smallest units", () => {
		expect(parseAssetAmount("1", 18)).toBe(10n ** 18n); // 1 ETH
		expect(parseAssetAmount("1", 6)).toBe(1_000_000n); // 1 USDC
		expect(parseAssetAmount("1.5", 9)).toBe(1_500_000_000n); // 1.5 SOL
	});

	it("pads and truncates fractional digits to the asset's precision", () => {
		expect(parseAssetAmount("0.000001", 6)).toBe(1n); // smallest USDC unit
		expect(parseAssetAmount("12.34", 6)).toBe(12_340_000n);
	});
});

describe("formatAssetAmount", () => {
	it("round-trips and trims trailing zeros", () => {
		expect(formatAssetAmount(1_000_000n, 6)).toBe("1");
		expect(formatAssetAmount(12_340_000n, 6)).toBe("12.34");
		expect(formatAssetAmount(1_500_000_000n, 9)).toBe("1.5");
		expect(formatAssetAmount(0n, 18)).toBe("0");
	});

	it("caps displayed fraction digits", () => {
		expect(formatAssetAmount(1_234_567n, 6, 2)).toBe("1.23");
	});
});

describe("validateStakeAmount", () => {
	const usdc = STAKE_ASSETS.USDC;
	const sol = STAKE_ASSETS.SOL;

	it("rejects empty and malformed input", () => {
		expect(validateStakeAmount("", usdc)).toEqual({ ok: false, error: "empty" });
		expect(validateStakeAmount("  ", usdc)).toEqual({ ok: false, error: "empty" });
		expect(validateStakeAmount("abc", usdc)).toEqual({ ok: false, error: "invalid-number" });
		expect(validateStakeAmount("1,5", usdc)).toEqual({ ok: false, error: "invalid-number" });
		expect(validateStakeAmount("-1", usdc)).toEqual({ ok: false, error: "invalid-number" });
		expect(validateStakeAmount(".", usdc)).toEqual({ ok: false, error: "invalid-number" });
	});

	it("rejects more fractional digits than the asset supports", () => {
		// USDC supports 6 decimals; 7 is too many.
		expect(validateStakeAmount("1.1234567", usdc)).toEqual({
			ok: false,
			error: "too-many-decimals",
		});
		// SOL supports 9 decimals; 6 is fine.
		expect(validateStakeAmount("1.123456", sol)).toEqual({ ok: true, value: 1_123_456_000n });
	});

	it("rejects zero", () => {
		expect(validateStakeAmount("0", usdc)).toEqual({ ok: false, error: "not-positive" });
		expect(validateStakeAmount("0.000000", usdc)).toEqual({ ok: false, error: "not-positive" });
	});

	it("enforces a minimum stake", () => {
		expect(validateStakeAmount("0.5", usdc, { min: 1_000_000n })).toEqual({
			ok: false,
			error: "below-min",
		});
		expect(validateStakeAmount("1", usdc, { min: 1_000_000n })).toEqual({
			ok: true,
			value: 1_000_000n,
		});
	});

	it("enforces wallet balance", () => {
		expect(validateStakeAmount("100", usdc, { balance: 50_000_000n })).toEqual({
			ok: false,
			error: "insufficient-balance",
		});
		expect(validateStakeAmount("40", usdc, { balance: 50_000_000n })).toEqual({
			ok: true,
			value: 40_000_000n,
		});
	});
});
