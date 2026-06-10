import { buildWalletAnalyticsSummary, getAnalyticsInsight } from "@/lib/walletAnalytics";
import type { Contract } from "@/types";

const WALLET = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";

function makeContract(overrides: Partial<Contract>): Contract {
	return {
		client: WALLET,
		arbitrationFeeBps: 500,
		holdBackBps: 1000,
		status: 1,
		freelancer: OTHER,
		warrantyDeadline: 0n,
		projectDeadline: 0n,
		acceptanceWindow: 0n,
		acceptanceDeadline: 0n,
		warrantyPeriod: 0n,
		amount: 1_000_000_000_000_000_000n,
		holdBackAmount: 100_000_000_000_000_000n,
		arbitrationId: 0n,
		contractHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
		contractURI: "ipfs://contract",
		proofOfWorkHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
		proofOfWorkURI: "",
		token: "0x0000000000000000000000000000000000000000",
		usdValueAtCreation: 0n,
		previousContractId: 0n,
		proposedByClient: true,
		freelancerAccepted: false,
		...overrides,
	};
}

describe("wallet analytics", () => {
	it("summarizes public contract state without needing private data", () => {
		const summary = buildWalletAnalyticsSummary(
			[
				makeContract({ status: 3 }),
				makeContract({ status: 4, freelancer: WALLET, client: OTHER, amount: 2n }),
				makeContract({ status: 1, client: OTHER, freelancer: OTHER }),
			],
			WALLET,
		);

		expect(summary.totalContracts).toBe(2);
		expect(summary.asClient).toBe(1);
		expect(summary.asFreelancer).toBe(1);
		expect(summary.completed).toBe(1);
		expect(summary.disputed).toBe(1);
		expect(summary.totalEscrowedWei).toBe(1_000_000_000_000_000_002n);
		expect(summary.statusCounts[3]).toBe(1);
		expect(summary.statusCounts[4]).toBe(1);
		expect(getAnalyticsInsight(summary)).toMatch(/higher dispute rate/u);
	});

	it("returns a privacy-safe empty state insight", () => {
		const summary = buildWalletAnalyticsSummary([], WALLET);

		expect(summary.totalContracts).toBe(0);
		expect(summary.privacyScore).toBe(100);
		expect(getAnalyticsInsight(summary)).toMatch(/No public TrustLedger contracts/u);
	});
});
