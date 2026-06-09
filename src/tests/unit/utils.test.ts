import {
	daysToSeconds,
	formatAddress,
	formatDeadline,
	formatTokenAmount,
	resolveDocUrl,
} from "@/lib/utils";

describe("frontend utility helpers", () => {
	it("resolves supported document URI formats", () => {
		expect(resolveDocUrl("ipfs://QmHash")).toBe("https://gateway.pinata.cloud/ipfs/QmHash");
		expect(resolveDocUrl("ar://abc123")).toBe("https://arweave.net/abc123");
		expect(resolveDocUrl("https://example.com/doc.pdf")).toBe("https://example.com/doc.pdf");
		expect(resolveDocUrl("not a url")).toBeUndefined();
	});

	it("formats durations, addresses, deadlines, and token amounts", () => {
		expect(daysToSeconds(1.5)).toBe(129600n);
		expect(formatAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
		expect(formatDeadline(0n, "en-US")).toBe("-");
		expect(formatDeadline(1735776000n, "en-US")).toBe("Jan 1, 2025");
		expect(
			formatTokenAmount(
				1_500_000_000_000_000_000n,
				"0x0000000000000000000000000000000000000000",
				"en-US",
			),
		).toBe("1.5 ETH");
		expect(
			formatTokenAmount(123_456_789n, "0x1111111111111111111111111111111111111111", "en-US"),
		).toBe("123.46 USDC");
	});
});
