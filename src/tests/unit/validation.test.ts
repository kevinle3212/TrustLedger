import {
	validateContractUri,
	validateDeliverableUri,
	validateEmail,
	validateEthAddress,
	validateEthAmount,
	validateNumberInRange,
	validateRequired,
	validateScore,
	validateUsdcAmount,
} from "@/lib/validation";

describe("frontend validators", () => {
	it("validates required values and Ethereum addresses", () => {
		expect(validateRequired("   ", "Client")).toBe("Client is required.");
		expect(validateRequired("client")).toBeUndefined();
		expect(validateEthAddress("0x0000000000000000000000000000000000000000")).toBeUndefined();
		expect(validateEthAddress("not-an-address")).toMatch(/valid Ethereum address/);
	});

	it("validates ETH and USDC amount precision and bounds", () => {
		expect(validateEthAmount("0")).toBe("Amount must be greater than 0 ETH.");
		expect(validateEthAmount("0.123456789012345678")).toBeUndefined();
		expect(validateEthAmount("abc")).toBe("Enter a valid number, e.g. 0.05.");
		expect(validateEthAmount("2", 1)).toBe("Amount exceeds the available 1 ETH.");

		expect(validateUsdcAmount("100.123456")).toBeUndefined();
		expect(validateUsdcAmount("abc")).toBe("Enter a valid number, e.g. 100.");
		expect(validateUsdcAmount("101", 100)).toBe("Amount exceeds the available 100 USDC.");
	});

	it("validates numeric ranges, scores, document URIs, deliverables, and email", () => {
		expect(validateNumberInRange("5", 1, 10, { integer: true, unit: "days" })).toBeUndefined();
		expect(validateNumberInRange("5.5", 1, 10, { integer: true })).toBe(
			"Enter a whole number.",
		);
		expect(validateScore("101")).toBe("Enter a value between 1 and 100.");

		expect(validateContractUri("ipfs://Qm123")).toBeUndefined();
		expect(validateContractUri("notaurl")).toMatch(/ipfs/);
		expect(validateDeliverableUri("https://example.com/ipfs/Qm123")).toBeUndefined();
		expect(validateDeliverableUri("http://example.com")).toMatch(/valid URL or IPFS/);

		expect(validateEmail("", false)).toBeUndefined();
		expect(validateEmail("", true)).toBe("Enter an email address.");
		expect(validateEmail("name@example.com")).toBeUndefined();
	});
});
