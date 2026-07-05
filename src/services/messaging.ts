import "server-only";

import { isDatabaseConfigured } from "@/lib/db/client";
import * as conversationsRepo from "@/lib/db/repositories/conversations";
import * as messagesRepo from "@/lib/db/repositories/messages";
import * as messagingKeysRepo from "@/lib/db/repositories/messagingKeys";

/**
 * End-to-end messaging service. Stores only wrapped keys, public keys, and
 * ciphertext — never plaintext or the KEK. Backs the `/api/messages/*` routes.
 *
 * When the off-chain database is unconfigured the service falls back to an
 * in-memory store so development and tests run without a database. Server-only.
 */

/** A wallet's wrapped messaging identity, as stored and exchanged. */
export interface KeyBundle {
	readonly publicKey: string;
	readonly wrappedPrivateKey: string;
	readonly wrapNonce: string;
}

/** A conversation summarized for a viewer: the peer and their unread count. */
export interface ConversationSummary {
	readonly id: string;
	readonly peer: string;
	readonly lastMessageAt: string;
	readonly unread: number;
}

/** An encrypted message as returned to a participant. Dates are ISO strings. */
export interface MessageView {
	readonly id: string;
	readonly senderAddress: string;
	readonly ciphertext: string;
	readonly nonce: string;
	readonly moderationFlag: string | null;
	readonly moderationCategories: string[];
	readonly createdAt: string;
	readonly readAt: string | null;
}

/** Ciphertext payload appended to a conversation. */
export interface AppendMessageInput {
	readonly ciphertext: string;
	readonly nonce: string;
	readonly moderationFlag?: string | null;
	readonly moderationCategories?: string[];
}

interface MemoryConversation {
	id: string;
	participantA: string;
	participantB: string;
	contractId: string | null;
	lastMessageAt: number;
}

interface MemoryMessage {
	id: string;
	conversationId: string;
	senderAddress: string;
	ciphertext: string;
	nonce: string;
	moderationFlag: string | null;
	moderationCategories: string[];
	createdAt: number;
	readAt: number | null;
}

const memoryKeys = new Map<string, KeyBundle>();
const memoryConversations = new Map<string, MemoryConversation>();
const memoryMessages = new Map<string, MemoryMessage[]>();
let memoryCounter = 0;

/** Lowercases a wallet address so records key consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Normalizes and sorts a wallet pair into canonical `[A, B]` order. */
function sortPair(a: string, b: string): [string, string] {
	return [normalize(a), normalize(b)].sort() as [string, string];
}

/** Registers or replaces a wallet's wrapped messaging identity. */
export async function registerKey(self: string, bundle: KeyBundle): Promise<void> {
	const address = normalize(self);
	if (isDatabaseConfigured()) {
		await messagingKeysRepo.upsert(address, bundle);
		return;
	}
	memoryKeys.set(address, bundle);
}

/** Returns a wallet's public key, or `null` when it has not registered one. */
export async function getPublicKey(wallet: string): Promise<string | null> {
	const address = normalize(wallet);
	if (isDatabaseConfigured()) {
		const record = await messagingKeysRepo.getByWallet(address);
		return record?.publicKey ?? null;
	}
	return memoryKeys.get(address)?.publicKey ?? null;
}

/** Returns a wallet's own wrapped key bundle, or `null` when unregistered. */
export async function getOwnKeyBundle(wallet: string): Promise<KeyBundle | null> {
	const address = normalize(wallet);
	if (isDatabaseConfigured()) {
		const record = await messagingKeysRepo.getByWallet(address);
		return record === null
			? null
			: {
					publicKey: record.publicKey,
					wrappedPrivateKey: record.wrappedPrivateKey,
					wrapNonce: record.wrapNonce,
				};
	}
	return memoryKeys.get(address) ?? null;
}

/** Returns the conversation for `self` and `peer`, creating it when missing. */
export async function getOrCreateConversation(
	self: string,
	peer: string,
	contractId?: string,
): Promise<string> {
	const [participantA, participantB] = sortPair(self, peer);
	if (isDatabaseConfigured()) {
		const conversation = await conversationsRepo.getOrCreate(
			participantA,
			participantB,
			contractId,
		);
		return conversation.id;
	}
	for (const conversation of memoryConversations.values()) {
		if (
			conversation.participantA === participantA &&
			conversation.participantB === participantB
		)
			return conversation.id;
	}
	memoryCounter += 1;
	const id = `mem-conv-${String(memoryCounter)}`;
	memoryConversations.set(id, {
		id,
		participantA,
		participantB,
		contractId: contractId ?? null,
		lastMessageAt: Date.now(),
	});
	memoryMessages.set(id, []);
	return id;
}

/** Lists a wallet's conversations, most recently active first, with unread counts. */
export async function listConversations(self: string): Promise<ConversationSummary[]> {
	const address = normalize(self);
	if (isDatabaseConfigured()) {
		const rows = await conversationsRepo.listForWallet(address);
		// Fetch every conversation's messages concurrently to avoid an N+1 of
		// sequential per-row queries.
		return await Promise.all(
			rows.map(async (row) => {
				const peer = row.participantA === address ? row.participantB : row.participantA;
				const messages = await messagesRepo.listByConversation(row.id);
				const unread = messages.filter(
					(message) => message.senderAddress !== address && message.readAt === null,
				).length;
				return {
					id: row.id,
					peer,
					lastMessageAt: row.lastMessageAt.toISOString(),
					unread,
				};
			}),
		);
	}
	return [...memoryConversations.values()]
		.filter((row) => row.participantA === address || row.participantB === address)
		.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
		.map((row) => {
			const peer = row.participantA === address ? row.participantB : row.participantA;
			const unread = (memoryMessages.get(row.id) ?? []).filter(
				(message) => message.senderAddress !== address && message.readAt === null,
			).length;
			return {
				id: row.id,
				peer,
				lastMessageAt: new Date(row.lastMessageAt).toISOString(),
				unread,
			};
		});
}

/** Throws unless `address` is a participant of the given conversation. */
async function assertParticipant(address: string, conversationId: string): Promise<void> {
	if (isDatabaseConfigured()) {
		const conversation = await conversationsRepo.getById(conversationId);
		if (
			conversation === null ||
			(conversation.participantA !== address && conversation.participantB !== address)
		)
			throw new Error("Not a participant of this conversation.");
		return;
	}
	const conversation = memoryConversations.get(conversationId);
	if (
		conversation === undefined ||
		(conversation.participantA !== address && conversation.participantB !== address)
	)
		throw new Error("Not a participant of this conversation.");
}

/** Returns a conversation's messages, gated to participants only. */
export async function getMessages(self: string, conversationId: string): Promise<MessageView[]> {
	const address = normalize(self);
	// react-doctor-disable-next-line react-doctor/async-defer-await -- Authorization barrier: participation must be confirmed (and throw) before any message is read.
	await assertParticipant(address, conversationId);
	if (isDatabaseConfigured()) {
		const rows = await messagesRepo.listByConversation(conversationId);
		return rows.map((row) => ({
			id: row.id,
			senderAddress: row.senderAddress,
			ciphertext: row.ciphertext,
			nonce: row.nonce,
			moderationFlag: row.moderationFlag,
			moderationCategories: row.moderationCategories,
			createdAt: row.createdAt.toISOString(),
			readAt: row.readAt === null ? null : row.readAt.toISOString(),
		}));
	}
	return (memoryMessages.get(conversationId) ?? []).map((row) => ({
		id: row.id,
		senderAddress: row.senderAddress,
		ciphertext: row.ciphertext,
		nonce: row.nonce,
		moderationFlag: row.moderationFlag,
		moderationCategories: row.moderationCategories,
		createdAt: new Date(row.createdAt).toISOString(),
		readAt: row.readAt === null ? null : new Date(row.readAt).toISOString(),
	}));
}

/** Appends an encrypted message to a conversation, gated to participants only. */
export async function appendMessage(
	self: string,
	conversationId: string,
	input: AppendMessageInput,
): Promise<string> {
	const address = normalize(self);
	// react-doctor-disable-next-line react-doctor/async-defer-await -- Authorization barrier: participation must be confirmed (and throw) before a message is appended.
	await assertParticipant(address, conversationId);
	if (isDatabaseConfigured()) {
		const message = await messagesRepo.append({
			conversationId,
			senderAddress: address,
			ciphertext: input.ciphertext,
			nonce: input.nonce,
			...(input.moderationFlag === undefined ? {} : { moderationFlag: input.moderationFlag }),
			...(input.moderationCategories === undefined
				? {}
				: { moderationCategories: input.moderationCategories }),
		});
		await conversationsRepo.touch(conversationId);
		return message.id;
	}
	memoryCounter += 1;
	const id = `mem-msg-${String(memoryCounter)}`;
	const list = memoryMessages.get(conversationId) ?? [];
	list.push({
		id,
		conversationId,
		senderAddress: address,
		ciphertext: input.ciphertext,
		nonce: input.nonce,
		moderationFlag: input.moderationFlag ?? null,
		moderationCategories: input.moderationCategories ?? [],
		createdAt: Date.now(),
		readAt: null,
	});
	memoryMessages.set(conversationId, list);
	const conversation = memoryConversations.get(conversationId);
	if (conversation !== undefined) conversation.lastMessageAt = Date.now();
	return id;
}

/** Marks a conversation's inbound messages read for the caller. Participant-gated. */
export async function markRead(self: string, conversationId: string): Promise<void> {
	const address = normalize(self);
	// react-doctor-disable-next-line react-doctor/async-defer-await -- Authorization barrier: participation must be confirmed (and throw) before messages are marked read.
	await assertParticipant(address, conversationId);
	if (isDatabaseConfigured()) {
		await messagesRepo.markRead(conversationId, address);
		return;
	}
	for (const message of memoryMessages.get(conversationId) ?? []) {
		if (message.senderAddress !== address && message.readAt === null)
			message.readAt = Date.now();
	}
}

/**
 * Clears the in-memory messaging store. Test-only helper for deterministic state
 * between cases.
 *
 * @internal
 */
export function resetMessagingForTests(): void {
	memoryKeys.clear();
	memoryConversations.clear();
	memoryMessages.clear();
	memoryCounter = 0;
}
