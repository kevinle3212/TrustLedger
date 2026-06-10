import {
	getContractSummaryMetrics,
	resetContractSummaryForTests,
	summarizeContract,
	type ContractSummaryInput,
} from "@/services/contractSummary";

jest.mock("server-only", () => ({}), { virtual: true });

const input: ContractSummaryInput = {
	contractId: "7",
	contractHash: "hash-a",
	statusLabel: "Active",
	client: "0x1111111111111111111111111111111111111111",
	freelancer: "0x2222222222222222222222222222222222222222",
	amount: "1.5 ETH",
	tokenSymbol: "ETH",
	projectDeadlineIso: "2026-07-01T00:00:00.000Z",
	acceptanceDeadlineIso: null,
	warrantyDeadlineIso: null,
	holdBackBps: 500,
	proposedByClient: true,
	sourceMetadataVersion: "test-v1",
};

describe("contract summary service", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv, AI_SUMMARY_PROVIDER: "disabled" };
		resetContractSummaryForTests();
	});

	afterEach(() => {
		process.env = originalEnv;
		jest.restoreAllMocks();
	});

	it("returns a deterministic fallback without provider credentials", async () => {
		const result = await summarizeContract(input);

		expect(result.provider).toBe("disabled");
		expect(result.status).toBe("disabled");
		expect(result.summary).toContain("Contract #7 is Active");
		expect(result.summary).not.toContain(input.client);
		expect(result.summary).toContain("0x1111...1111");
	});

	it("caches by contract hash, status, and source metadata version", async () => {
		const first = await summarizeContract(input);
		const second = await summarizeContract(input);

		expect(second.cached).toBe(true);
		expect(second.cacheKey).toBe(first.cacheKey);
		expect(getContractSummaryMetrics().cacheHits).toBe(1);
	});

	it("falls back cleanly when a managed provider errors", async () => {
		process.env["AI_SUMMARY_PROVIDER"] = "groq";
		process.env["GROQ_API_KEY"] = "test-key";
		global.fetch = jest.fn(async () => {
			await Promise.resolve();
			return { ok: false, status: 429 } as Response;
		});

		const result = await summarizeContract(input);

		expect(result.provider).toBe("groq");
		expect(result.status).toBe("fallback");
		expect(getContractSummaryMetrics().providerErrors).toBe(1);
	});
});
