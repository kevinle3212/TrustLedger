"use client";

import { useCallback, useRef, useState } from "react";
import { useSignTypedData } from "wagmi";

import {
	base64ToBytes,
	bytesToBase64,
	deriveKek,
	deriveMessageKey,
	generateIdentity,
	unwrapPrivateKey,
	wrapPrivateKey,
	type X25519Identity,
} from "@/lib/crypto/e2e";

/**
 * Client-side orchestration for TrustLedger's end-to-end encrypted messaging.
 *
 * Wraps `@/lib/crypto/e2e` (the pure crypto primitives) with the wallet
 * signature, key-registration, and per-conversation key-derivation flow. The
 * unwrapped private key and derived conversation keys live only in memory for
 * the lifetime of the page — nothing sensitive is ever written to storage.
 */

/**
 * The fixed (nonce-free) EIP-712 typed data signed to derive the messaging
 * key-encryption key (KEK). Deterministic so the same signature — and thus the
 * same KEK — can be re-derived on any device to unwrap the stored private key.
 */
const MESSAGING_KEY_TYPED_DATA = {
	domain: { name: "TrustLedger", version: "1" },
	types: {
		MessagingKey: [{ name: "purpose", type: "string" }],
	},
	primaryType: "MessagingKey" as const,
	message: { purpose: "Derive TrustLedger messaging key-encryption key" },
};

/** Shape of `GET /api/messages/keys/me`. */
interface OwnKeyBundle {
	readonly publicKey: string;
	readonly wrappedPrivateKey: string;
	readonly wrapNonce: string;
}

async function fetchOwnKeyBundle(token: string): Promise<OwnKeyBundle | null> {
	const response = await fetch("/api/messages/keys/me", {
		headers: { authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Could not load your encrypted messaging key.");
	return (await response.json()) as OwnKeyBundle | null;
}

async function registerKeyBundle(
	token: string,
	identity: X25519Identity,
	wrapped: { wrappedPrivateKey: string; wrapNonce: string },
): Promise<void> {
	const response = await fetch("/api/messages/keys", {
		method: "POST",
		headers: {
			"authorization": `Bearer ${token}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			publicKey: bytesToBase64(identity.publicKey),
			wrappedPrivateKey: wrapped.wrappedPrivateKey,
			wrapNonce: wrapped.wrapNonce,
		}),
	});
	if (!response.ok) throw new Error("Could not register your encrypted messaging key.");
}

/** Lifecycle of the local messaging identity (key setup/load). */
type MessagingIdentityStatus = "idle" | "loading" | "ready" | "error";

/** Return shape of {@link useMessagingIdentity}. */
export interface UseMessagingIdentityResult {
	/** The in-memory X25519 identity once loaded or generated, otherwise `null`. */
	readonly identity: X25519Identity | null;
	readonly status: MessagingIdentityStatus;
	readonly error: string | null;
	/**
	 * Loads the caller's existing messaging key (unwrapping it locally) or, on
	 * first use, generates and registers a new one. Requires a wallet signature
	 * over the fixed {@link MESSAGING_KEY_TYPED_DATA} message.
	 */
	readonly ensureIdentity: () => Promise<X25519Identity | null>;
}

/**
 * Manages the wallet owner's messaging identity: generation and registration on
 * first use, or unwrapping the existing key on reload.
 *
 * @param token - The bearer session token; identity setup is a no-op without one.
 */
export function useMessagingIdentity(token: string | null): UseMessagingIdentityResult {
	const { signTypedDataAsync } = useSignTypedData();
	const [identity, setIdentity] = useState<X25519Identity | null>(null);
	const [status, setStatus] = useState<MessagingIdentityStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const inFlightRef = useRef<Promise<X25519Identity | null> | null>(null);

	const ensureIdentity = useCallback(async (): Promise<X25519Identity | null> => {
		if (identity !== null) return identity;
		if (token === null) return null;
		if (inFlightRef.current !== null) return await inFlightRef.current;

		const load = (async (): Promise<X25519Identity | null> => {
			setStatus("loading");
			setError(null);
			try {
				const bundle = await fetchOwnKeyBundle(token);
				const signature = await signTypedDataAsync(MESSAGING_KEY_TYPED_DATA);
				const kek = deriveKek(signature);

				let nextIdentity: X25519Identity;
				if (bundle === null) {
					nextIdentity = generateIdentity();
					const wrapped = wrapPrivateKey(nextIdentity.privateKey, kek);
					await registerKeyBundle(token, nextIdentity, wrapped);
				} else {
					const privateKey = unwrapPrivateKey(
						bundle.wrappedPrivateKey,
						bundle.wrapNonce,
						kek,
					);
					nextIdentity = { privateKey, publicKey: base64ToBytes(bundle.publicKey) };
				}
				setIdentity(nextIdentity);
				setStatus("ready");
				return nextIdentity;
			} catch (caught) {
				setError(
					caught instanceof Error
						? caught.message
						: "Could not set up encrypted messaging.",
				);
				setStatus("error");
				return null;
			} finally {
				inFlightRef.current = null;
			}
		})();
		inFlightRef.current = load;
		return await load;
	}, [identity, token, signTypedDataAsync]);

	return { identity, status, error, ensureIdentity };
}

/**
 * Fetches a peer's public messaging key.
 *
 * @param token - The bearer session token.
 * @param peerAddress - The peer's wallet address.
 * @returns The peer's base64 public key, or `null` if they have not registered one.
 */
export async function fetchPeerPublicKey(
	token: string,
	peerAddress: string,
): Promise<string | null> {
	const response = await fetch(`/api/messages/keys?wallet=${encodeURIComponent(peerAddress)}`, {
		headers: { authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Could not load the recipient's messaging key.");
	const body = (await response.json()) as { publicKey: string | null };
	return body.publicKey;
}

/**
 * Derives the shared per-conversation message key from this device's private
 * key and the peer's base64 public key.
 *
 * @param myPrivateKey - This device's unwrapped 32-byte private key.
 * @param peerPublicKeyB64 - The peer's base64 public key.
 * @param myAddress - This wallet's address.
 * @param peerAddress - The peer's wallet address.
 * @returns The 32-byte conversation message key.
 */
export function deriveConversationKey(
	myPrivateKey: Uint8Array,
	peerPublicKeyB64: string,
	myAddress: string,
	peerAddress: string,
): Uint8Array {
	return deriveMessageKey(myPrivateKey, base64ToBytes(peerPublicKeyB64), myAddress, peerAddress);
}
