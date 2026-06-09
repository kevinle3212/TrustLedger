import {
	calculateAppealBond,
	calculateLinearPayout,
	isRulingSet,
	validateEvidenceInput,
} from "@/utils/arbitration";
import { getRecentDisputeIds } from "@/hooks/useRecentDisputeIds";

describe("arbitration utilities", () => {
	it("calculates appeal bonds and linear payouts", () => {
		expect(calculateAppealBond(10_000n)).toBe(15_000n);
		expect(calculateLinearPayout(75n, 3_000n)).toBe(1_500n);
	});

	it("identifies unset rulings", () => {
		expect(isRulingSet(2n ** 256n - 1n)).toBe(false);
		expect(isRulingSet(50n)).toBe(true);
	});

	it("validates evidence inputs", () => {
		expect(
			validateEvidenceInput({
				summary: "Delivered files do not match the agreed milestone.",
				uri: "ipfs://QmEvidence",
				requestedCompletionPct: 30,
			}),
		).toBeUndefined();
		expect(
			validateEvidenceInput({
				summary: "Delivered files do not match the agreed milestone.",
				uri: "ftp://example.com/evidence.pdf",
				requestedCompletionPct: 30,
			}),
		).toMatch("URI");
		expect(
			validateEvidenceInput({
				summary: "short",
				uri: "ipfs://QmEvidence",
				requestedCompletionPct: 30,
			}),
		).toMatch("Summary");
	});

	it("returns most recent dispute IDs newest first", () => {
		expect(getRecentDisputeIds(0n)).toEqual([]);
		expect(getRecentDisputeIds(3n)).toEqual([2n, 1n, 0n]);
		expect(getRecentDisputeIds(30n)[0]).toBe(29n);
		expect(getRecentDisputeIds(30n)).toHaveLength(25);
	});
});
