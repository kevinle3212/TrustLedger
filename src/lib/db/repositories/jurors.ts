import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { Juror } from "@/lib/generated/prisma/client";

/** Upsert payload for a juror's off-chain profile/analytics cache. */
export interface JurorUpsertInput {
	readonly chainId: number;
	readonly walletAddress: string;
	readonly stakeAmount?: bigint;
	readonly reputationScore?: number;
	readonly isActive?: boolean;
}

/** Inserts or updates a juror keyed by (chainId, walletAddress). */
export async function upsertJuror(input: JurorUpsertInput): Promise<Juror> {
	const key = { chainId: input.chainId, walletAddress: input.walletAddress };
	const writable = {
		// DECIMAL(78,0) column: pass wei as a string to avoid precision loss.
		...(input.stakeAmount === undefined ? {} : { stakeAmount: input.stakeAmount.toString() }),
		...(input.reputationScore === undefined ? {} : { reputationScore: input.reputationScore }),
		...(input.isActive === undefined ? {} : { isActive: input.isActive }),
		lastActiveAt: new Date(),
	};
	return await getPrisma().juror.upsert({
		where: { chainId_walletAddress: key },
		create: { ...key, ...writable },
		update: writable,
	});
}

/** Returns the top jurors by reputation for a chain (for leaderboards/analytics). */
export async function listTopJurors(chainId: number, take = 25): Promise<Juror[]> {
	return await getPrisma().juror.findMany({
		where: { chainId, isActive: true },
		orderBy: { reputationScore: "desc" },
		take,
	});
}

/** Records the outcome of a juror's case, incrementing vote/win counters. */
export async function recordJurorCaseResult(
	chainId: number,
	walletAddress: string,
	won: boolean,
): Promise<Juror> {
	return await getPrisma().juror.update({
		where: { chainId_walletAddress: { chainId, walletAddress } },
		data: {
			casesVoted: { increment: 1 },
			...(won ? { casesWon: { increment: 1 } } : {}),
			lastActiveAt: new Date(),
		},
	});
}
