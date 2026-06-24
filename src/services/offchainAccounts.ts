import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { verifyTypedData } from "viem";

/** Off-chain user profile stored in the TrustLedger accounts database and returned by `GET /api/accounts/profile`. */
export interface AccountProfile {
	readonly walletAddress: `0x${string}`;
	readonly displayName: string;
	readonly avatarUrl: string;
	readonly email: string;
	readonly onboardingComplete: boolean;
	readonly notificationsEnabled: boolean;
	readonly totpEnabled: boolean;
	readonly updatedAt: string;
}

/** JWT session claims for an authenticated wallet account. */
export interface AccountSession {
	readonly walletAddress: `0x${string}`;
	readonly issuedAt: number;
	readonly expiresAt: number;
}

const profiles = new Map<string, AccountProfile>();
const nonces = new Map<string, { nonce: string; expiresAt: number }>();
const SESSION_TTL_MS = 30 * 60 * 1000;

function normalizeWallet(address: string): `0x${string}` | null {
	const trimmed = address.trim().toLowerCase();
	return /^0x[a-f0-9]{40}$/.test(trimmed) ? (trimmed as `0x${string}`) : null;
}

function secret(): string {
	return (
		process.env["ACCOUNT_SESSION_SECRET"] ??
		process.env["AUTH_JWT_SECRET"] ??
		"dev-only-account-session-secret"
	);
}

function sign(payload: string): string {
	return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function defaultProfile(walletAddress: `0x${string}`): AccountProfile {
	return {
		walletAddress,
		displayName: "",
		avatarUrl: "",
		email: "",
		onboardingComplete: false,
		notificationsEnabled: true,
		totpEnabled: false,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Issues a single-use, expiring EIP-712 challenge a wallet must sign to prove
 * ownership of `address` before a session can be created.
 *
 * @param address - Wallet address requesting authentication.
 * @returns The challenge payload (domain, types, and message) to be signed.
 * @throws When `address` is not a valid wallet address.
 */
export function createAccountChallenge(address: string): {
	readonly walletAddress: `0x${string}`;
	readonly nonce: string;
	readonly expiresAt: string;
	readonly domain: { readonly name: string; readonly version: string };
	readonly types: {
		readonly TrustLedgerSignIn: readonly [
			{ readonly name: "wallet"; readonly type: "address" },
			{ readonly name: "nonce"; readonly type: "string" },
			{ readonly name: "purpose"; readonly type: "string" },
		];
	};
	readonly message: {
		readonly wallet: `0x${string}`;
		readonly nonce: string;
		readonly purpose: string;
	};
} {
	const walletAddress = normalizeWallet(address);
	if (walletAddress === null) throw new Error("Invalid wallet address.");
	const nonce = randomUUID();
	const expiresAt = Date.now() + 5 * 60 * 1000;
	nonces.set(walletAddress, { nonce, expiresAt });
	return {
		walletAddress,
		nonce,
		expiresAt: new Date(expiresAt).toISOString(),
		domain: { name: "TrustLedger", version: "1" },
		types: {
			TrustLedgerSignIn: [
				{ name: "wallet", type: "address" },
				{ name: "nonce", type: "string" },
				{ name: "purpose", type: "string" },
			],
		},
		message: {
			wallet: walletAddress,
			nonce,
			purpose: "Sign In To TrustLedger Off-Chain Services",
		},
	};
}

/**
 * Verifies a signed challenge and, on success, issues a short-lived signed
 * session token bound to the wallet.
 *
 * @param input - `{ walletAddress, signature }` where `signature` covers the
 *   previously issued challenge.
 * @returns A signed session token string.
 * @throws When verification fails (bad/expired challenge or signature).
 */
export async function createAccountSession(input: {
	readonly walletAddress: string;
	readonly signature: `0x${string}`;
}): Promise<string> {
	const walletAddress = normalizeWallet(input.walletAddress);
	if (walletAddress === null) throw new Error("Invalid wallet address.");
	const challenge = nonces.get(walletAddress);
	if (challenge === undefined || challenge.expiresAt < Date.now())
		throw new Error("Challenge expired.");
	const valid = await verifyTypedData({
		address: walletAddress,
		domain: { name: "TrustLedger", version: "1" },
		types: {
			TrustLedgerSignIn: [
				{ name: "wallet", type: "address" },
				{ name: "nonce", type: "string" },
				{ name: "purpose", type: "string" },
			],
		},
		primaryType: "TrustLedgerSignIn",
		message: {
			wallet: walletAddress,
			nonce: challenge.nonce,
			purpose: "Sign In To TrustLedger Off-Chain Services",
		},
		signature: input.signature,
	});
	if (!valid) throw new Error("Signature verification failed.");
	nonces.delete(walletAddress);
	const session: AccountSession = {
		walletAddress,
		issuedAt: Date.now(),
		expiresAt: Date.now() + SESSION_TTL_MS,
	};
	const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
	return `${payload}.${sign(payload)}`;
}

/**
 * Verifies a session token's signature and expiry.
 *
 * @param token - Bearer session token, or `null` when absent.
 * @returns The decoded {@link AccountSession}, or `null` when missing, invalid,
 *   or expired.
 */
export function verifyAccountSession(token: string | null): AccountSession | null {
	if (token === null || token === "") return null;
	const [payload, signature] = token.split(".");
	if (payload === undefined || signature === undefined) return null;
	const expected = sign(payload);
	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(signature);
	if (
		expectedBuffer.length !== actualBuffer.length ||
		!timingSafeEqual(expectedBuffer, actualBuffer)
	)
		return null;
	const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AccountSession;
	if (parsed.expiresAt < Date.now()) return null;
	return parsed;
}

/**
 * Clears in-memory profiles and challenge nonces. Test-only helper for
 * deterministic state between cases.
 */
export function resetOffchainAccountsForTests(): void {
	profiles.clear();
	nonces.clear();
}

/**
 * Returns the stored off-chain profile for a wallet, or a default profile when
 * none has been saved yet.
 *
 * @param walletAddress - Wallet address to look up.
 * @returns The {@link AccountProfile}, or `null` when the address is invalid.
 */
export function getAccountProfile(walletAddress: string): AccountProfile | null {
	const normalized = normalizeWallet(walletAddress);
	if (normalized === null) return null;
	return profiles.get(normalized) ?? defaultProfile(normalized);
}

/**
 * Applies a whitelisted patch to a wallet's off-chain profile, clamping string
 * fields to safe lengths and stamping `updatedAt`.
 *
 * @param walletAddress - Wallet address whose profile to update.
 * @param patch - Partial profile with only the mutable fields.
 * @returns The updated {@link AccountProfile}.
 * @throws When `walletAddress` is invalid.
 */
export function updateAccountProfile(
	walletAddress: string,
	patch: Partial<
		Pick<
			AccountProfile,
			"displayName" | "avatarUrl" | "email" | "onboardingComplete" | "notificationsEnabled"
		>
	>,
): AccountProfile {
	const normalized = normalizeWallet(walletAddress);
	if (normalized === null) throw new Error("Invalid wallet address.");
	const current = profiles.get(normalized) ?? defaultProfile(normalized);
	const next: AccountProfile = {
		...current,
		...patch,
		displayName: patch.displayName?.slice(0, 80) ?? current.displayName,
		avatarUrl: patch.avatarUrl?.slice(0, 300) ?? current.avatarUrl,
		email: patch.email?.slice(0, 254) ?? current.email,
		updatedAt: new Date().toISOString(),
	};
	profiles.set(normalized, next);
	return next;
}
