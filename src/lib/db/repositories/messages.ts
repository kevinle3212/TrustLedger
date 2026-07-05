import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { Message } from "@/lib/generated/prisma/client";

/** Ciphertext payload plus optional content-free moderation flag for a message. */
export interface MessageInput {
	readonly conversationId: string;
	readonly senderAddress: string;
	readonly ciphertext: string;
	readonly nonce: string;
	readonly moderationFlag?: string | null;
	readonly moderationCategories?: string[];
}

/** Lowercases a wallet address so rows are stored consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Returns a conversation's messages in chronological order. */
export async function listByConversation(conversationId: string): Promise<Message[]> {
	return await getPrisma().message.findMany({
		where: { conversationId },
		orderBy: { createdAt: "asc" },
	});
}

/** Appends an encrypted message to a conversation. */
export async function append(input: MessageInput): Promise<Message> {
	return await getPrisma().message.create({
		data: {
			conversationId: input.conversationId,
			senderAddress: normalize(input.senderAddress),
			ciphertext: input.ciphertext,
			nonce: input.nonce,
			...(input.moderationFlag === undefined || input.moderationFlag === null
				? {}
				: { moderationFlag: input.moderationFlag }),
			...(input.moderationCategories === undefined
				? {}
				: { moderationCategories: input.moderationCategories }),
		},
	});
}

/**
 * Marks a conversation's inbound messages read for a reader — every message the
 * reader did not send that is still unread.
 *
 * @param conversationId - Conversation to mark.
 * @param readerWallet - Wallet reading the thread.
 * @returns The number of messages marked read.
 */
export async function markRead(conversationId: string, readerWallet: string): Promise<number> {
	const reader = normalize(readerWallet);
	const result = await getPrisma().message.updateMany({
		where: { conversationId, senderAddress: { not: reader }, readAt: null },
		data: { readAt: new Date() },
	});
	return result.count;
}
