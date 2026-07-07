import "server-only";

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createPublicClient, http, verifyTypedData } from "viem";
import { sepolia } from "viem/chains";

import { isDatabaseConfigured } from "@/lib/db/client";
import type { UserProfile } from "@/lib/generated/prisma/client";
import * as signInNonces from "@/lib/db/repositories/signInNonces";
import * as userProfiles from "@/lib/db/repositories/userProfiles";
import * as totp from "@/services/totp";

/** Off-chain user profile stored in the TrustLedger accounts database and returned by `GET /api/accounts/profile`. */
export interface AccountProfile {
	readonly walletAddress: `0x${string}`;
	readonly displayName: string;
	readonly avatarUrl: string;
	readonly email: string;
	readonly onboardingComplete: boolean;
	readonly notificationsEnabled: boolean;
	readonly totpEnabled: boolean;
	/** Inactivity auto-logout in milliseconds; `null` means "use the app default". */
	readonly inactivityTimeoutMs: number | null;
	readonly updatedAt: string;
}

/** JWT session claims for an authenticated wallet account. */
export interface AccountSession {
	readonly walletAddress: `0x${string}`;
	readonly issuedAt: number;
	readonly expiresAt: number;
}

const profiles = new Map<string, AccountProfile>();
// In-memory fallback only. When the database is configured, nonces persist via
// the signInNonces repository so the challenge and session POSTs can land on
// different serverless instances.
const nonces = new Map<string, { nonce: string; expiresAt: number }>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Reads the deployed TrustLedger address used to bind EIP-712 sign-in domains.
 */
function readVerifyingContract(): `0x${string}` {
	const value =
		process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA ??
		process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS ??
		"";
	return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as `0x${string}`) : ZERO_ADDRESS;
}

// EIP-712 domain for the sign-in challenge. Binding the domain to a chainId and
// verifying contract scopes a signed challenge to a single deployment so a
// signature captured elsewhere cannot be replayed against another TrustLedger
// environment (defense-in-depth alongside the single-use nonce). The challenge
// builder and verifier MUST use the identical domain, and the client signs the
// domain returned by the challenge, so this constant is the single source of truth.
const SIGN_IN_CHAIN_ID = sepolia.id;
const SIGN_IN_DOMAIN = {
	name: "TrustLedger",
	version: "1",
	chainId: SIGN_IN_CHAIN_ID,
	verifyingContract: readVerifyingContract(),
} as const;

function normalizeWallet(address: string): `0x${string}` | null {
	const trimmed = address.trim().toLowerCase();
	return /^0x[a-f0-9]{40}$/.test(trimmed) ? (trimmed as `0x${string}`) : null;
}

// Falls back to a random per-process secret (never a hardcoded literal) so
// development and tests can sign sessions without a configured secret, while a
// forgeable, source-visible key never ships. Production must set
// ACCOUNT_SESSION_SECRET (or AUTH_JWT_SECRET); sessions then survive restarts
// and multiple instances, which the ephemeral fallback intentionally does not.
let ephemeralSecret: string | undefined;
function secret(): string {
	const configured = process.env.ACCOUNT_SESSION_SECRET ?? process.env.AUTH_JWT_SECRET;
	if (configured !== undefined && configured !== "") return configured;
	ephemeralSecret ??= randomBytes(32).toString("base64url");
	return ephemeralSecret;
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
		inactivityTimeoutMs: null,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Maps a persisted {@link UserProfile} row to an {@link AccountProfile}. Fields
 * the off-chain table does not store (`notificationsEnabled`, `totpEnabled`)
 * fall back to their defaults.
 */
function mapProfile(walletAddress: `0x${string}`, row: UserProfile): AccountProfile {
	return {
		walletAddress,
		displayName: row.displayName ?? "",
		avatarUrl: row.avatarUrl ?? "",
		email: row.email ?? "",
		onboardingComplete: row.onboardingComplete,
		notificationsEnabled: true,
		totpEnabled: false,
		inactivityTimeoutMs: row.inactivityTimeoutMs,
		updatedAt: row.updatedAt.toISOString(),
	};
}

/** Whitelisted, mutable subset of an {@link AccountProfile}. */
type ProfilePatch = Partial<
	Pick<
		AccountProfile,
		| "displayName"
		| "avatarUrl"
		| "email"
		| "onboardingComplete"
		| "notificationsEnabled"
		| "inactivityTimeoutMs"
	>
>;

/** Applies a patch to a profile, clamping string fields and stamping `updatedAt`. */
function mergePatch(current: AccountProfile, patch: ProfilePatch): AccountProfile {
	return {
		...current,
		...patch,
		displayName: patch.displayName?.slice(0, 80) ?? current.displayName,
		avatarUrl: patch.avatarUrl?.slice(0, 300) ?? current.avatarUrl,
		email: patch.email?.slice(0, 254) ?? current.email,
		inactivityTimeoutMs:
			patch.inactivityTimeoutMs === undefined
				? current.inactivityTimeoutMs
				: patch.inactivityTimeoutMs,
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
export async function createAccountChallenge(address: string): Promise<{
	readonly walletAddress: `0x${string}`;
	readonly nonce: string;
	readonly expiresAt: string;
	readonly domain: {
		readonly name: string;
		readonly version: string;
		readonly chainId: number;
		readonly verifyingContract: `0x${string}`;
	};
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
}> {
	const walletAddress = normalizeWallet(address);
	if (walletAddress === null) throw new Error("Invalid wallet address.");
	const nonce = randomUUID();
	const expiresAt = Date.now() + 5 * 60 * 1000;
	if (isDatabaseConfigured()) {
		await signInNonces.put(walletAddress, nonce, new Date(expiresAt));
	} else {
		nonces.set(walletAddress, { nonce, expiresAt });
	}
	return {
		walletAddress,
		nonce,
		expiresAt: new Date(expiresAt).toISOString(),
		domain: SIGN_IN_DOMAIN,
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
 * @param input - `{ walletAddress, signature, totpCode? }` where `signature`
 *   covers the previously issued challenge and `totpCode` is required when the
 *   wallet has TOTP two-factor enabled.
 * @returns A signed session token string.
 * @throws When verification fails (bad/expired challenge or signature), with
 *   `Error("TOTP_REQUIRED")` when 2FA is enabled but no code was supplied, or
 *   `Error("Invalid two-factor code.")` when the supplied code is wrong.
 */
export async function createAccountSession(input: {
	readonly walletAddress: string;
	readonly signature: `0x${string}`;
	readonly totpCode?: string;
}): Promise<string> {
	const walletAddress = normalizeWallet(input.walletAddress);
	if (walletAddress === null) throw new Error("Invalid wallet address.");
	let challenge: { nonce: string; expiresAt: number } | undefined;
	if (isDatabaseConfigured()) {
		const row = await signInNonces.getByWallet(walletAddress);
		if (row !== null) challenge = { nonce: row.nonce, expiresAt: row.expiresAt.getTime() };
	} else {
		challenge = nonces.get(walletAddress);
	}
	if (challenge === undefined || challenge.expiresAt < Date.now())
		throw new Error("Challenge expired.");
	// Smart-contract wallets (Coinbase Smart Wallet, AppKit embedded accounts)
	// produce ERC-1271/6492 signatures that the pure `verifyTypedData` always
	// rejects; those need an on-chain check via a public client. Fall back to
	// pure ECDSA verification when no RPC URL is configured (dev/tests).
	const rpcUrl = process.env.SEPOLIA_RPC_URL;
	const typedData = {
		address: walletAddress,
		domain: SIGN_IN_DOMAIN,
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
	} as const;
	const valid =
		rpcUrl !== undefined && rpcUrl !== ""
			? await createPublicClient({ chain: sepolia, transport: http(rpcUrl) }).verifyTypedData(
					typedData,
				)
			: await verifyTypedData(typedData);
	if (!valid) throw new Error("Signature verification failed.");
	if (await totp.isEnabled(walletAddress)) {
		if (input.totpCode === undefined || input.totpCode === "") throw new Error("TOTP_REQUIRED");
		if (!(await totp.verify(walletAddress, input.totpCode)))
			throw new Error("Invalid two-factor code.");
	}
	if (isDatabaseConfigured()) {
		await signInNonces.deleteByWallet(walletAddress);
	} else {
		nonces.delete(walletAddress);
	}
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
 * When the off-chain database is configured, the profile is read through the
 * `userProfiles` repository; otherwise it falls back to the in-memory store.
 *
 * @param walletAddress - Wallet address to look up.
 * @returns The {@link AccountProfile}, or `null` when the address is invalid.
 */
export async function getAccountProfile(walletAddress: string): Promise<AccountProfile | null> {
	const normalized = normalizeWallet(walletAddress);
	if (normalized === null) return null;
	const totpEnabled = await totp.isEnabled(normalized);
	if (isDatabaseConfigured()) {
		const row = await userProfiles.getByWallet(normalized);
		const base = row === null ? defaultProfile(normalized) : mapProfile(normalized, row);
		return { ...base, totpEnabled };
	}
	return { ...(profiles.get(normalized) ?? defaultProfile(normalized)), totpEnabled };
}

/**
 * Applies a whitelisted patch to a wallet's off-chain profile, clamping string
 * fields to safe lengths and stamping `updatedAt`.
 *
 * When the off-chain database is configured, the change is written through the
 * `userProfiles` repository; otherwise it updates the in-memory store. Note that
 * `notificationsEnabled` and `totpEnabled` are not persisted in the database.
 *
 * @param walletAddress - Wallet address whose profile to update.
 * @param patch - Partial profile with only the mutable fields.
 * @returns The updated {@link AccountProfile}.
 * @throws When `walletAddress` is invalid.
 */
export async function updateAccountProfile(
	walletAddress: string,
	patch: ProfilePatch,
): Promise<AccountProfile> {
	const normalized = normalizeWallet(walletAddress);
	if (normalized === null) throw new Error("Invalid wallet address.");
	if (isDatabaseConfigured()) {
		const existing = await userProfiles.getByWallet(normalized);
		const base =
			existing === null ? defaultProfile(normalized) : mapProfile(normalized, existing);
		const next = mergePatch(base, patch);
		const row = await userProfiles.upsert(normalized, {
			displayName: next.displayName,
			avatarUrl: next.avatarUrl,
			email: next.email,
			inactivityTimeoutMs: next.inactivityTimeoutMs,
			onboardingComplete: next.onboardingComplete,
		});
		return mapProfile(normalized, row);
	}
	const current = profiles.get(normalized) ?? defaultProfile(normalized);
	const next = mergePatch(current, patch);
	profiles.set(normalized, next);
	return next;
}
