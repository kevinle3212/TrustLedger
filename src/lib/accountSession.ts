"use client";

import { useCallback, useRef, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";

/**
 * Client session acquisition for TrustLedger's off-chain account APIs.
 *
 * Implements the challenge/response flow (`POST /api/accounts/challenge` then
 * `POST /api/accounts/session`) including the optional TOTP step-up, and caches
 * the resulting bearer token in `sessionStorage` (never `localStorage`) keyed by
 * the lowercased wallet address so a refresh doesn't force a re-sign within the
 * same tab, while a closed tab always starts fresh.
 */

/** The EIP-712 challenge payload returned by `POST /api/accounts/challenge`. */
interface AccountChallenge {
	readonly walletAddress: `0x${string}`;
	readonly nonce: string;
	readonly expiresAt: string;
	readonly domain: {
		readonly name: string;
		readonly version: string;
		readonly chainId: number;
		readonly verifyingContract: `0x${string}`;
	};
	readonly types: Record<string, readonly { name: string; type: string }[]>;
	readonly message: Record<string, unknown>;
}

/** Successful `POST /api/accounts/session` response. */
interface SessionGranted {
	readonly token: string;
	readonly expiresInSeconds: number;
}

/** Lifecycle of a session acquisition attempt. */
type AccountSessionStatus = "idle" | "authenticating" | "totp-required" | "ready" | "error";

const SESSION_STORAGE_PREFIX = "trustledger:session:";

interface CachedSession {
	readonly token: string;
	readonly expiresAt: number;
}

function sessionKey(address: string): string {
	return `${SESSION_STORAGE_PREFIX}${address.toLowerCase()}`;
}

function readCachedToken(address: string): string | null {
	try {
		const raw = window.sessionStorage.getItem(sessionKey(address));
		if (raw === null) return null;
		const parsed = JSON.parse(raw) as CachedSession;
		if (typeof parsed.token !== "string" || parsed.expiresAt <= Date.now()) return null;
		return parsed.token;
	} catch {
		return null;
	}
}

function writeCachedToken(address: string, token: string, expiresInSeconds: number): void {
	try {
		const cached: CachedSession = {
			token,
			expiresAt: Date.now() + expiresInSeconds * 1000,
		};
		window.sessionStorage.setItem(sessionKey(address), JSON.stringify(cached));
	} catch {
		// sessionStorage unavailable (private mode, etc.); token still works in memory.
	}
}

async function fetchChallenge(address: string): Promise<AccountChallenge> {
	const response = await fetch("/api/accounts/challenge", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ address }),
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error ?? "Could not start sign-in.");
	}
	return (await response.json()) as AccountChallenge;
}

/** Discriminated result of a `POST /api/accounts/session` call. */
type SessionResult =
	| ({ readonly ok: true } & SessionGranted)
	| { readonly ok: false; readonly totpRequired: boolean; readonly error: string };

async function postSession(input: {
	readonly walletAddress: string;
	readonly signature: `0x${string}`;
	readonly totpCode?: string;
}): Promise<SessionResult> {
	const response = await fetch("/api/accounts/session", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	});
	const body = (await response.json().catch(() => ({}))) as {
		token?: string;
		expiresInSeconds?: number;
		error?: string;
		totpRequired?: boolean;
	};
	if (
		response.ok &&
		typeof body.token === "string" &&
		typeof body.expiresInSeconds === "number"
	) {
		return { ok: true, token: body.token, expiresInSeconds: body.expiresInSeconds };
	}
	return {
		ok: false,
		totpRequired: body.totpRequired === true,
		error: body.error ?? "Sign-in failed.",
	};
}

/** A pending sign-in awaiting a TOTP code, held only in memory. */
interface PendingTotpStepUp {
	readonly walletAddress: `0x${string}`;
	readonly signature: `0x${string}`;
	readonly resolve: (token: string | null) => void;
}

/** Return shape of {@link useAccountSession}. */
export interface UseAccountSessionResult {
	/** The cached bearer token once acquired, otherwise `null`. */
	readonly token: string | null;
	/** Current stage of the acquisition flow. */
	readonly status: AccountSessionStatus;
	/** Human-readable error from the last failed attempt, if any. */
	readonly error: string | null;
	/**
	 * Acquires (or returns the cached) bearer session token, prompting a wallet
	 * signature if needed. Resolves to `null` (with `status` set to
	 * `"totp-required"`) when the wallet has two-factor enabled — call
	 * {@link UseAccountSessionResult.promptTotp} with the user's code to finish.
	 */
	readonly ensureSession: () => Promise<string | null>;
	/** Submits a 6-digit TOTP code to complete a pending sign-in step-up. */
	readonly promptTotp: (code: string) => Promise<string | null>;
	/** Abandons a pending TOTP step-up without completing sign-in. */
	readonly cancelTotp: () => void;
}

/**
 * Acquires and caches a bearer session token for the connected wallet, via the
 * EIP-712 challenge/response flow, including the TOTP step-up when the wallet
 * has two-factor authentication enabled.
 *
 * @returns Session state and the `ensureSession` / `promptTotp` controls.
 */
export function useAccountSession(): UseAccountSessionResult {
	const { address } = useAccount();
	const { signTypedDataAsync } = useSignTypedData();
	const [token, setToken] = useState<string | null>(null);
	const [status, setStatus] = useState<AccountSessionStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const pendingRef = useRef<PendingTotpStepUp | null>(null);

	const ensureSession = useCallback(async (): Promise<string | null> => {
		if (address === undefined) return null;
		const cached = readCachedToken(address);
		if (cached !== null) {
			setToken(cached);
			setStatus("ready");
			return cached;
		}
		setStatus("authenticating");
		setError(null);
		try {
			const challenge = await fetchChallenge(address);
			const signature = await signTypedDataAsync({
				domain: challenge.domain,
				types: challenge.types,
				primaryType: "TrustLedgerSignIn",
				message: challenge.message,
			});
			const result = await postSession({ walletAddress: address, signature });
			if (!result.ok) {
				if (result.totpRequired) {
					return await new Promise<string | null>((resolve) => {
						pendingRef.current = {
							walletAddress: challenge.walletAddress,
							signature,
							resolve,
						};
						setStatus("totp-required");
					});
				}
				setError(result.error);
				setStatus("error");
				return null;
			}
			writeCachedToken(address, result.token, result.expiresInSeconds);
			setToken(result.token);
			setStatus("ready");
			return result.token;
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Sign-in failed.");
			setStatus("error");
			return null;
		}
	}, [address, signTypedDataAsync]);

	const promptTotp = useCallback(
		async (code: string): Promise<string | null> => {
			const pending = pendingRef.current;
			if (pending === null || address === undefined) return null;
			try {
				const result = await postSession({
					walletAddress: pending.walletAddress,
					signature: pending.signature,
					totpCode: code,
				});
				if (!result.ok) {
					setError(result.error);
					setStatus("totp-required");
					return null;
				}
				writeCachedToken(address, result.token, result.expiresInSeconds);
				setToken(result.token);
				setStatus("ready");
				pendingRef.current = null;
				pending.resolve(result.token);
				return result.token;
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : "Sign-in failed.");
				setStatus("totp-required");
				return null;
			}
		},
		[address],
	);

	const cancelTotp = useCallback((): void => {
		const pending = pendingRef.current;
		pendingRef.current = null;
		setStatus("idle");
		if (pending !== null) pending.resolve(null);
	}, []);

	return { token, status, error, ensureSession, promptTotp, cancelTotp };
}
