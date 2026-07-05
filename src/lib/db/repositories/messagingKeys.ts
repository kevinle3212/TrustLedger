import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { MessagingKey } from "@/lib/generated/prisma/client";

/** Wrapped messaging identity fields written when a wallet registers its key. */
export interface MessagingKeyInput {
	readonly publicKey: string;
	readonly wrappedPrivateKey: string;
	readonly wrapNonce: string;
}

/** Lowercases a wallet address so rows are stored and queried consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Returns the stored messaging key for a wallet, or `null` when none exists. */
export async function getByWallet(address: string): Promise<MessagingKey | null> {
	return await getPrisma().messagingKey.findUnique({
		where: { walletAddress: normalize(address) },
	});
}

/** Inserts or replaces a wallet's wrapped messaging identity. */
export async function upsert(address: string, input: MessagingKeyInput): Promise<MessagingKey> {
	const walletAddress = normalize(address);
	return await getPrisma().messagingKey.upsert({
		where: { walletAddress },
		create: { walletAddress, ...input },
		update: input,
	});
}
