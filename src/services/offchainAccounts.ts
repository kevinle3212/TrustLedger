import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { verifyTypedData } from "viem";

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

export function resetOffchainAccountsForTests(): void {
	profiles.clear();
	nonces.clear();
}

export function getAccountProfile(walletAddress: string): AccountProfile | null {
	const normalized = normalizeWallet(walletAddress);
	if (normalized === null) return null;
	return profiles.get(normalized) ?? defaultProfile(normalized);
}

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
