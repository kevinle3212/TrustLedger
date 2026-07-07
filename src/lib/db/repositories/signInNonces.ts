import "server-only";

import { getPrisma } from "@/lib/db/client";

/** Lowercases a wallet address so lookups match how rows are stored. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Stores (or replaces) the pending sign-in challenge nonce for a wallet. */
export async function put(address: string, nonce: string, expiresAt: Date): Promise<void> {
	const walletAddress = normalize(address);
	await getPrisma().signInNonce.upsert({
		where: { walletAddress },
		create: { walletAddress, nonce, expiresAt },
		update: { nonce, expiresAt },
	});
}

/** Returns the pending challenge nonce for a wallet, or `null` when none exists. */
export async function getByWallet(
	address: string,
): Promise<{ nonce: string; expiresAt: Date } | null> {
	const row = await getPrisma().signInNonce.findUnique({
		where: { walletAddress: normalize(address) },
		select: { nonce: true, expiresAt: true },
	});
	return row;
}

/** Deletes a wallet's pending challenge nonce (single-use consumption). */
export async function deleteByWallet(address: string): Promise<void> {
	await getPrisma().signInNonce.deleteMany({
		where: { walletAddress: normalize(address) },
	});
}
