import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { Conversation } from "@/lib/generated/prisma/client";

/** Lowercases a wallet address so rows are stored and queried consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Normalizes and sorts a wallet pair into the canonical `[A, B]` order. */
function sortPair(a: string, b: string): [string, string] {
	return [normalize(a), normalize(b)].sort() as [string, string];
}

/**
 * Returns the conversation for a normalized wallet pair, creating it when
 * missing. The pair is lowercased and sorted so it maps to a single row.
 */
export async function getOrCreate(
	a: string,
	b: string,
	contractId?: string,
): Promise<Conversation> {
	const [participantA, participantB] = sortPair(a, b);
	return await getPrisma().conversation.upsert({
		where: { participantA_participantB: { participantA, participantB } },
		create: {
			participantA,
			participantB,
			...(contractId === undefined ? {} : { contractId }),
		},
		update: {},
	});
}

/** Lists a wallet's conversations, most recently active first. */
export async function listForWallet(wallet: string): Promise<Conversation[]> {
	const address = normalize(wallet);
	return await getPrisma().conversation.findMany({
		where: { OR: [{ participantA: address }, { participantB: address }] },
		orderBy: { lastMessageAt: "desc" },
	});
}

/** Returns a conversation by id, or `null` when it does not exist. */
export async function getById(id: string): Promise<Conversation | null> {
	return await getPrisma().conversation.findUnique({ where: { id } });
}

/** Bumps a conversation's `lastMessageAt` to now. */
export async function touch(id: string): Promise<void> {
	await getPrisma().conversation.update({
		where: { id },
		data: { lastMessageAt: new Date() },
	});
}
