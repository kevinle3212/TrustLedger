import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { DisputeStatus, VoteChoice } from "@/lib/generated/prisma/enums";
import type { Dispute } from "@/lib/generated/prisma/client";

/** Upsert payload for a dispute's off-chain record. */
export interface DisputeUpsertInput {
	readonly chainId: number;
	readonly onChainDisputeId: bigint;
	readonly contractMetadataId?: string | null;
	readonly status?: DisputeStatus;
	readonly evidenceCid?: string | null;
	readonly outcome?: VoteChoice | null;
	readonly resolvedAt?: Date | null;
}

/** Inserts or updates a dispute keyed by (chainId, onChainDisputeId). */
export async function upsertDispute(input: DisputeUpsertInput): Promise<Dispute> {
	const key = { chainId: input.chainId, onChainDisputeId: input.onChainDisputeId };
	const writable = {
		...(input.contractMetadataId === undefined
			? {}
			: { contractMetadataId: input.contractMetadataId }),
		...(input.status === undefined ? {} : { status: input.status }),
		...(input.evidenceCid === undefined ? {} : { evidenceCid: input.evidenceCid }),
		...(input.outcome === undefined ? {} : { outcome: input.outcome }),
		...(input.resolvedAt === undefined ? {} : { resolvedAt: input.resolvedAt }),
	};
	return await getPrisma().dispute.upsert({
		where: { chainId_onChainDisputeId: key },
		create: { ...key, ...writable },
		update: writable,
	});
}

/** Lists disputes for a chain filtered by status, newest first. */
export async function listDisputesByStatus(
	chainId: number,
	status: DisputeStatus,
): Promise<Dispute[]> {
	return await getPrisma().dispute.findMany({
		where: { chainId, status },
		orderBy: { openedAt: "desc" },
	});
}
