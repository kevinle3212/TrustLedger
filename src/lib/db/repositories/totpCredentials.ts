import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { TotpCredential } from "@/lib/generated/prisma/client";

/** Encrypted TOTP secret fields written when a wallet begins 2FA setup. */
export interface TotpCredentialInput {
	readonly encryptedSecret: string;
	readonly secretNonce: string;
	readonly enabled?: boolean;
	readonly recoveryCodes?: string[];
	readonly confirmedAt?: Date | null;
}

/** Lowercases a wallet address so rows are stored and queried consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/** Returns the stored TOTP credential for a wallet, or `null` when none exists. */
export async function getByWallet(address: string): Promise<TotpCredential | null> {
	return await getPrisma().totpCredential.findUnique({
		where: { walletAddress: normalize(address) },
	});
}

/** Inserts or replaces a wallet's TOTP credential (typically during setup). */
export async function upsert(address: string, input: TotpCredentialInput): Promise<TotpCredential> {
	const walletAddress = normalize(address);
	const writable = {
		encryptedSecret: input.encryptedSecret,
		secretNonce: input.secretNonce,
		...(input.enabled === undefined ? {} : { enabled: input.enabled }),
		...(input.recoveryCodes === undefined ? {} : { recoveryCodes: input.recoveryCodes }),
		...(input.confirmedAt === undefined ? {} : { confirmedAt: input.confirmedAt }),
	};
	return await getPrisma().totpCredential.upsert({
		where: { walletAddress },
		create: { walletAddress, ...writable },
		update: writable,
	});
}

/** Enables or disables a wallet's TOTP credential, storing recovery hashes when enabling. */
export async function setEnabled(
	address: string,
	enabled: boolean,
	recoveryCodes?: string[],
): Promise<TotpCredential> {
	return await getPrisma().totpCredential.update({
		where: { walletAddress: normalize(address) },
		data: {
			enabled,
			confirmedAt: enabled ? new Date() : null,
			...(recoveryCodes === undefined ? {} : { recoveryCodes }),
		},
	});
}

/** Overwrites a wallet's stored recovery-code hashes (after one is consumed). */
export async function setRecoveryCodes(
	address: string,
	recoveryCodes: string[],
): Promise<TotpCredential> {
	return await getPrisma().totpCredential.update({
		where: { walletAddress: normalize(address) },
		data: { recoveryCodes },
	});
}

/** Deletes a wallet's TOTP credential (on disable). */
export async function remove(address: string): Promise<void> {
	await getPrisma().totpCredential.delete({
		where: { walletAddress: normalize(address) },
	});
}
