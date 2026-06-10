import type { Contract } from "@/types";

export const ANALYTICS_STATUS_LABELS = [
	"Pending",
	"Active",
	"Submitted",
	"Approved",
	"Disputed",
	"Resolved",
	"Cancelled",
] as const;

export interface WalletAnalyticsSummary {
	readonly totalContracts: number;
	readonly asClient: number;
	readonly asFreelancer: number;
	readonly completed: number;
	readonly active: number;
	readonly disputed: number;
	readonly totalEscrowedWei: bigint;
	readonly averageHoldBackBps: number;
	readonly statusCounts: readonly number[];
	readonly completionRatePct: number;
	readonly disputeRatePct: number;
	readonly privacyScore: number;
}

function matches(address: string, candidate: string): boolean {
	return address.toLowerCase() === candidate.toLowerCase();
}

function percent(part: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((part / total) * 100);
}

export function buildWalletAnalyticsSummary(
	contracts: readonly Contract[],
	walletAddress: `0x${string}`,
): WalletAnalyticsSummary {
	const mine = contracts.filter(
		(contract) =>
			matches(walletAddress, contract.client) || matches(walletAddress, contract.freelancer),
	);
	const statusCounts = Array.from({ length: ANALYTICS_STATUS_LABELS.length }, () => 0);
	let asClient = 0;
	let asFreelancer = 0;
	let totalEscrowedWei = 0n;
	let holdBackTotal = 0;

	for (const contract of mine) {
		if (matches(walletAddress, contract.client)) asClient += 1;
		if (matches(walletAddress, contract.freelancer)) asFreelancer += 1;
		if (contract.status >= 0 && contract.status < statusCounts.length) {
			const currentCount = statusCounts[contract.status] ?? 0;
			statusCounts[contract.status] = currentCount + 1;
		}
		totalEscrowedWei += contract.amount;
		holdBackTotal += contract.holdBackBps;
	}

	const totalContracts = mine.length;
	const completed = (statusCounts[3] ?? 0) + (statusCounts[5] ?? 0);
	const disputed = statusCounts[4] ?? 0;
	const active = (statusCounts[1] ?? 0) + (statusCounts[2] ?? 0);
	const completionRatePct = percent(completed, totalContracts);
	const disputeRatePct = percent(disputed, totalContracts);
	const averageHoldBackBps =
		totalContracts === 0 ? 0 : Math.round(holdBackTotal / totalContracts);
	const privacyScore = Math.max(0, 100 - disputeRatePct - Math.min(20, averageHoldBackBps / 100));

	return {
		totalContracts,
		asClient,
		asFreelancer,
		completed,
		active,
		disputed,
		totalEscrowedWei,
		averageHoldBackBps,
		statusCounts,
		completionRatePct,
		disputeRatePct,
		privacyScore: Math.round(privacyScore),
	};
}

export function getAnalyticsInsight(summary: WalletAnalyticsSummary): string {
	if (summary.totalContracts === 0) {
		return "No public TrustLedger contracts were found for this connected wallet yet.";
	}
	if (summary.disputeRatePct >= 25) {
		return "A higher dispute rate is visible in public contract states. Review terms, milestones, and evidence quality before new work starts.";
	}
	if (summary.completionRatePct >= 75) {
		return "Most visible contracts are completed or resolved, which indicates a healthy TrustLedger workflow history.";
	}
	return "Your public activity is still developing. Track funded, submitted, approved, and disputed states as you use the platform.";
}
