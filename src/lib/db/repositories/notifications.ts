import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { Notification } from "@/lib/generated/prisma/client";

/** Payload for recording a new in-app notification. */
export interface NotificationCreateInput {
	readonly walletAddress: string;
	readonly type: string;
	readonly title: string;
	readonly body: string;
	readonly contractId?: string;
}

/** Lowercases a wallet address so rows are stored and queried consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Records a new notification in a wallet's inbox. */
export async function create(input: NotificationCreateInput): Promise<Notification> {
	return await getPrisma().notification.create({
		data: {
			walletAddress: normalize(input.walletAddress),
			type: input.type,
			title: input.title,
			body: input.body,
			...(input.contractId === undefined ? {} : { contractId: input.contractId }),
		},
	});
}

/** Returns a wallet's notifications, most recent first, capped at `limit`. */
export async function listByWallet(address: string, limit = 50): Promise<Notification[]> {
	return await getPrisma().notification.findMany({
		where: { walletAddress: normalize(address) },
		orderBy: { createdAt: "desc" },
		take: limit,
	});
}

/**
 * Marks a notification read for a wallet.
 *
 * @param id - Notification id.
 * @param address - Wallet that must own the notification.
 * @returns `true` when a row was updated, `false` when it does not exist or is
 *   owned by another wallet (the caller should surface a 404).
 */
export async function markRead(id: string, address: string): Promise<boolean> {
	const result = await getPrisma().notification.updateMany({
		where: { id, walletAddress: normalize(address), readAt: null },
		data: { readAt: new Date() },
	});
	if (result.count > 0) return true;
	// Distinguish "already read but owned" (still 200) from "not owned" (404).
	const existing = await getPrisma().notification.findFirst({
		where: { id, walletAddress: normalize(address) },
		select: { id: true },
	});
	return existing !== null;
}
