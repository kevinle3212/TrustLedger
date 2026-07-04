import "server-only";

import { getPrisma, isDatabaseConfigured } from "@/lib/db/client";
import type { UserProfile } from "@/lib/generated/prisma/client";

/** Writable off-chain profile fields keyed by wallet. `null` clears a value. */
export interface UserProfilePatch {
	readonly displayName?: string | null;
	readonly email?: string | null;
	readonly avatarUrl?: string | null;
	/** Inactivity auto-logout in ms; `null` means "use the app default". */
	readonly inactivityTimeoutMs?: number | null;
	readonly onboardingComplete?: boolean;
}

/** Lowercases a wallet address so lookups match how rows are stored. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Returns the stored profile for a wallet, or `null` when none exists. */
export async function getByWallet(address: string): Promise<UserProfile | null> {
	return await getPrisma().userProfile.findUnique({
		where: { walletAddress: normalize(address) },
	});
}

/** Inserts or updates a wallet's profile, applying only the provided fields. */
export async function upsert(address: string, patch: UserProfilePatch): Promise<UserProfile> {
	const walletAddress = normalize(address);
	const writable = {
		...(patch.displayName === undefined ? {} : { displayName: patch.displayName }),
		...(patch.email === undefined ? {} : { email: patch.email }),
		...(patch.avatarUrl === undefined ? {} : { avatarUrl: patch.avatarUrl }),
		...(patch.inactivityTimeoutMs === undefined
			? {}
			: { inactivityTimeoutMs: patch.inactivityTimeoutMs }),
		...(patch.onboardingComplete === undefined
			? {}
			: { onboardingComplete: patch.onboardingComplete }),
	};
	return await getPrisma().userProfile.upsert({
		where: { walletAddress },
		create: { walletAddress, ...writable },
		update: writable,
	});
}

/**
 * Resolves the notification email on file for a wallet.
 *
 * @param address - Wallet address to look up.
 * @returns The stored email, or `null` when the database is unconfigured, the
 *   profile is missing, or no email is set. Used by the deadline cron with an
 *   env-map fallback.
 */
export async function emailForWallet(address: string): Promise<string | null> {
	if (!isDatabaseConfigured()) return null;
	const profile = await getPrisma().userProfile.findUnique({
		where: { walletAddress: normalize(address) },
		select: { email: true },
	});
	return profile?.email ?? null;
}
