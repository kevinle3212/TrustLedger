import "server-only";

import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";

import { isDatabaseConfigured } from "@/lib/db/client";
import * as totpCredentials from "@/lib/db/repositories/totpCredentials";

/**
 * Opt-in TOTP two-factor service. Backs `/api/account/2fa/*` and the session
 * step-up in {@link file://./offchainAccounts.ts}. The shared secret is stored
 * encrypted (AES-256-GCM); recovery codes are stored only as sha256 hashes.
 *
 * When the off-chain database is unconfigured the service falls back to an
 * in-memory store so development and tests run without a database. Server-only.
 */

const ISSUER = "TrustLedger";
const RECOVERY_CODE_COUNT = 10;
/** Clock-skew tolerance in seconds: one 30-second TOTP step either side. */
const VERIFY_TOLERANCE_SECONDS = 30;

/** In-memory record mirroring a persisted {@link totpCredentials} row. */
interface MemoryCredential {
	secret: string;
	enabled: boolean;
	recoveryCodes: string[];
}

const memory = new Map<string, MemoryCredential>();

/** Result of beginning TOTP setup: the provisioning URI and the raw secret. */
export interface TotpSetup {
	readonly otpauthUri: string;
	readonly secret: string;
}

/** Lowercases a wallet address so records key consistently. */
function normalize(address: string): string {
	return address.trim().toLowerCase();
}

/**
 * The key material used to encrypt TOTP secrets. Uses `TOTP_ENCRYPTION_KEY`
 * (base64) when set so secrets survive restarts and multiple instances;
 * otherwise falls back to a random per-process key (dev only — secrets become
 * undecryptable after a restart). Production MUST set `TOTP_ENCRYPTION_KEY`.
 */
let ephemeralKey: Buffer | undefined;
function totpKeySecret(): Buffer {
	const configured = process.env.TOTP_ENCRYPTION_KEY;
	if (configured !== undefined && configured !== "") return Buffer.from(configured, "base64");
	ephemeralKey ??= randomBytes(32);
	return ephemeralKey;
}

/** Derives the 32-byte AES key from the configured key secret. */
function encryptionKey(): Buffer {
	return Buffer.from(
		hkdfSync(
			"sha256",
			totpKeySecret(),
			Buffer.from("TrustLedger-TOTP-v1"),
			Buffer.from("totp-secret-enc"),
			32,
		),
	);
}

/** Encrypts a TOTP secret with AES-256-GCM, returning base64 ciphertext + nonce. */
function encryptSecret(secret: string): { encryptedSecret: string; secretNonce: string } {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return {
		encryptedSecret: Buffer.concat([ciphertext, authTag]).toString("base64"),
		secretNonce: iv.toString("base64"),
	};
}

/** Reverses {@link encryptSecret}, recovering the raw TOTP secret. */
function decryptSecret(encryptedSecret: string, secretNonce: string): string {
	const combined = Buffer.from(encryptedSecret, "base64");
	const authTag = combined.subarray(combined.length - 16);
	const ciphertext = combined.subarray(0, combined.length - 16);
	const decipher = createDecipheriv(
		"aes-256-gcm",
		encryptionKey(),
		Buffer.from(secretNonce, "base64"),
	);
	decipher.setAuthTag(authTag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Hashes a recovery code to the sha256 hex we persist. */
function hashRecoveryCode(code: string): string {
	return createHash("sha256").update(code).digest("hex");
}

/** Generates `RECOVERY_CODE_COUNT` human-friendly one-time recovery codes. */
function generateRecoveryCodes(): string[] {
	return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
		const raw = randomBytes(5).toString("hex");
		return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
	});
}

/**
 * Checks a submitted TOTP token against a secret with the skew window. Returns
 * `false` for anything that is not a 6-digit numeric code (e.g. a recovery code)
 * rather than letting otplib throw a `TokenLengthError` on malformed input.
 */
function checkToken(secret: string, code: string): boolean {
	if (!/^\d{6}$/.test(code)) return false;
	return verifySync({
		strategy: "totp",
		secret,
		token: code,
		epochTolerance: VERIFY_TOLERANCE_SECONDS,
	}).valid;
}

/**
 * Begins TOTP setup for a wallet: generates a secret, stores it encrypted and
 * disabled, and returns the provisioning URI plus the raw secret for the QR code
 * and manual entry. Overwrites any prior unconfirmed setup.
 *
 * @param wallet - Wallet enabling 2FA.
 * @returns The `otpauth://` URI and the base32 secret.
 */
export async function beginSetup(wallet: string): Promise<TotpSetup> {
	const address = normalize(wallet);
	const secret = generateSecret();
	const otpauthUri = generateURI({ strategy: "totp", issuer: ISSUER, label: address, secret });
	if (isDatabaseConfigured()) {
		await totpCredentials.upsert(address, {
			...encryptSecret(secret),
			enabled: false,
			recoveryCodes: [],
			confirmedAt: null,
		});
	} else {
		memory.set(address, { secret, enabled: false, recoveryCodes: [] });
	}
	return { otpauthUri, secret };
}

/**
 * Confirms TOTP setup by verifying a code, enabling 2FA, and issuing 10 one-time
 * recovery codes (returned once, in plaintext; only their hashes are stored).
 *
 * @param wallet - Wallet confirming 2FA.
 * @param code - Current 6-digit TOTP code.
 * @returns The plaintext recovery codes.
 * @throws When no setup is pending or the code is invalid.
 */
export async function confirmSetup(wallet: string, code: string): Promise<string[]> {
	const address = normalize(wallet);
	const recoveryCodes = generateRecoveryCodes();
	const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
	if (isDatabaseConfigured()) {
		const record = await totpCredentials.getByWallet(address);
		if (record === null) throw new Error("No two-factor setup in progress.");
		if (!checkToken(decryptSecret(record.encryptedSecret, record.secretNonce), code))
			throw new Error("Invalid two-factor code.");
		await totpCredentials.setEnabled(address, true, recoveryHashes);
	} else {
		const record = memory.get(address);
		if (record === undefined) throw new Error("No two-factor setup in progress.");
		if (!checkToken(record.secret, code)) throw new Error("Invalid two-factor code.");
		record.enabled = true;
		record.recoveryCodes = recoveryHashes;
	}
	return recoveryCodes;
}

/**
 * Disables 2FA for a wallet after verifying a TOTP or recovery code, deleting the
 * stored credential.
 *
 * @param wallet - Wallet disabling 2FA.
 * @param code - A valid TOTP code or unused recovery code.
 * @throws When 2FA is not enabled or the code is invalid.
 */
export async function disable(wallet: string, code: string): Promise<void> {
	const address = normalize(wallet);
	if (!(await isEnabled(address))) throw new Error("Two-factor authentication is not enabled.");
	if (!(await verify(address, code))) throw new Error("Invalid two-factor code.");
	if (isDatabaseConfigured()) {
		await totpCredentials.remove(address);
	} else {
		memory.delete(address);
	}
}

/**
 * Reports whether TOTP 2FA is enabled and confirmed for a wallet.
 *
 * @param wallet - Wallet to check.
 * @returns `true` when 2FA is active.
 */
export async function isEnabled(wallet: string): Promise<boolean> {
	const address = normalize(wallet);
	if (isDatabaseConfigured()) {
		const record = await totpCredentials.getByWallet(address);
		return record?.enabled ?? false;
	}
	return memory.get(address)?.enabled ?? false;
}

/**
 * Verifies a submitted code against a wallet's TOTP secret, or consumes a
 * matching one-time recovery code (removing it so it cannot be reused).
 *
 * @param wallet - Wallet to verify against.
 * @param code - A TOTP code or recovery code.
 * @returns `true` when the code is valid; `false` otherwise.
 */
export async function verify(wallet: string, code: string): Promise<boolean> {
	const address = normalize(wallet);
	const submittedHash = hashRecoveryCode(code);
	if (isDatabaseConfigured()) {
		const record = await totpCredentials.getByWallet(address);
		if (record?.enabled !== true) return false;
		if (checkToken(decryptSecret(record.encryptedSecret, record.secretNonce), code))
			return true;
		if (record.recoveryCodes.includes(submittedHash)) {
			await totpCredentials.setRecoveryCodes(
				address,
				record.recoveryCodes.filter((hash) => hash !== submittedHash),
			);
			return true;
		}
		return false;
	}
	const record = memory.get(address);
	if (record?.enabled !== true) return false;
	if (checkToken(record.secret, code)) return true;
	if (record.recoveryCodes.includes(submittedHash)) {
		record.recoveryCodes = record.recoveryCodes.filter((hash) => hash !== submittedHash);
		return true;
	}
	return false;
}

/**
 * Clears the in-memory TOTP store. Test-only helper for deterministic state
 * between cases.
 *
 * @internal
 */
export function resetTotpForTests(): void {
	memory.clear();
	ephemeralKey = undefined;
}
