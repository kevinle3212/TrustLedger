import { decodeContractError } from "@/lib/contractErrors";

describe("decodeContractError", () => {
	it("returns null for null and unknown errors", () => {
		expect(decodeContractError(null)).toBeNull();
		expect(decodeContractError(new Error("boom"))).toBeNull();
	});

	it("decodes nested viem-style error data", () => {
		const err = new Error("simulation failed") as Error & {
			cause: { data: { errorName: string } };
		};
		err.cause = { data: { errorName: "InvalidClientAddress" } };

		expect(decodeContractError(err)).toEqual({
			message:
				"Client address is required. Enter the wallet that will fund and approve the contract.",
			field: "clientAddress",
		});
	});

	it("decodes error names from messages and meta messages", () => {
		expect(decodeContractError(new Error("execution reverted: SelfContract()"))).toEqual({
			message: "You cannot propose a contract to yourself — use a different wallet address.",
			field: "client",
		});

		const err = new Error("write failed") as Error & { metaMessages: string[] };
		err.metaMessages = ["ContractFunctionExecutionError", "InvalidHoldBack()"];
		expect(decodeContractError(err)).toEqual({
			message: "Hold-back percentage must be None, 5%, 10%, or 15%.",
			field: "holdBack",
		});
	});
});
