import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { ContractStatus } from "@/lib/generated/prisma/enums";
import type { ContractMetadata } from "@/lib/generated/prisma/client";

/** Natural key that identifies one logical escrow contract on one chain. */
export interface ContractKey {
	readonly chainId: number;
	readonly contractAddress: string;
	readonly onChainId: bigint;
}

/** Mutable off-chain fields for a contract's metadata record. */
export interface ContractMetadataInput extends ContractKey {
	readonly clientAddress: string;
	readonly freelancerAddress?: string | null;
	readonly title?: string | null;
	readonly description?: string | null;
	readonly tokenSymbol?: string;
	readonly amount: bigint;
	readonly holdBackBps?: number;
	readonly status?: ContractStatus;
	readonly ipfsCid?: string | null;
	readonly metadataVersion?: string;
}

/**
 * Inserts or updates the off-chain metadata for a contract, keyed by
 * (chainId, contractAddress, onChainId). Safe to call repeatedly from indexers.
 */
export async function upsertContractMetadata(
	input: ContractMetadataInput,
): Promise<ContractMetadata> {
	const key = {
		chainId: input.chainId,
		contractAddress: input.contractAddress,
		onChainId: input.onChainId,
	};
	const writable = {
		clientAddress: input.clientAddress,
		freelancerAddress: input.freelancerAddress ?? null,
		title: input.title ?? null,
		description: input.description ?? null,
		tokenSymbol: input.tokenSymbol ?? "ETH",
		// uint256 wei values are stored as DECIMAL(78,0); pass as a string so
		// they survive without precision loss (bigint is not a Prisma Decimal input).
		amount: input.amount.toString(),
		holdBackBps: input.holdBackBps ?? 0,
		status: input.status ?? "PENDING",
		ipfsCid: input.ipfsCid ?? null,
		metadataVersion: input.metadataVersion ?? "1",
	};
	return await getPrisma().contractMetadata.upsert({
		where: { chainId_contractAddress_onChainId: key },
		create: { ...key, ...writable },
		update: writable,
	});
}

/** Looks up a single contract's metadata by its natural key. */
export async function findContractMetadata(key: ContractKey): Promise<ContractMetadata | null> {
	return await getPrisma().contractMetadata.findUnique({
		where: { chainId_contractAddress_onChainId: key },
	});
}

/** Lists a wallet's contracts (as client or freelancer), newest first. */
export async function listContractsForWallet(
	walletAddress: string,
	chainId?: number,
): Promise<ContractMetadata[]> {
	return await getPrisma().contractMetadata.findMany({
		where: {
			...(chainId === undefined ? {} : { chainId }),
			OR: [{ clientAddress: walletAddress }, { freelancerAddress: walletAddress }],
		},
		orderBy: { createdAt: "desc" },
	});
}
