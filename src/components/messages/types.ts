/** A conversation summary as returned by `GET /api/messages/conversations`. */
export interface ConversationSummary {
	readonly id: string;
	readonly peer: string;
	readonly lastMessageAt: string | null;
	readonly unread: number;
}

/** A message decrypted for display. `text` is `null` when decryption failed. */
export interface DecryptedMessage {
	readonly id: string;
	readonly senderAddress: string;
	readonly createdAt: string;
	readonly text: string | null;
	readonly moderationFlag: string | null;
	readonly moderationCategories: readonly string[];
}
