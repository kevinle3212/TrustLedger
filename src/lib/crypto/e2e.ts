import { x25519 } from "@noble/curves/ed25519.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hexToBytes, randomBytes } from "@noble/hashes/utils.js";

/**
 * Isomorphic end-to-end encryption primitives for TrustLedger in-app messaging.
 *
 * Runs unchanged in the browser and in Node (no `server-only`): the wallet owner
 * generates an X25519 identity, wraps the private key with a key-encryption key
 * (KEK) derived from a deterministic wallet signature, and exchanges messages
 * encrypted with XChaCha20-Poly1305 under a per-pair key derived via ECDH. The
 * server only ever stores ciphertext, wrapped keys, and public keys — never the
 * KEK or any plaintext. See NOTES.md ("Phase 6") for the design rationale.
 *
 * All binary fields cross the wire as standard (not URL) base64 strings.
 */

/** An X25519 identity: the raw 32-byte private and public keys. */
export interface X25519Identity {
	/** 32-byte X25519 private (secret) key. Never leaves the device unwrapped. */
	readonly privateKey: Uint8Array;
	/** 32-byte X25519 public key, published so peers can derive the shared key. */
	readonly publicKey: Uint8Array;
}

/** A wrapped private key and the nonce used to wrap it, both base64. */
export interface WrappedKey {
	/** Base64 XChaCha20-Poly1305 ciphertext of the 32-byte private key. */
	readonly wrappedPrivateKey: string;
	/** Base64 24-byte nonce used for the wrap. */
	readonly wrapNonce: string;
}

/** An encrypted message: base64 ciphertext plus the base64 nonce it used. */
export interface EncryptedMessage {
	/** Base64 XChaCha20-Poly1305 ciphertext of the UTF-8 plaintext. */
	readonly ciphertext: string;
	/** Base64 24-byte nonce used for this message. */
	readonly nonce: string;
}

/** Encodes bytes as a standard (not URL) base64 string. Isomorphic. */
export function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

/** Decodes a standard (not URL) base64 string back into bytes. Isomorphic. */
export function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Generates a fresh X25519 identity keypair.
 *
 * @returns The 32-byte private and public keys.
 */
export function generateIdentity(): X25519Identity {
	const privateKey = x25519.utils.randomSecretKey();
	const publicKey = x25519.getPublicKey(privateKey);
	return { privateKey, publicKey };
}

/**
 * Derives the 32-byte key-encryption key (KEK) that wraps the messaging private
 * key, from a wallet's signature over the fixed `TrustLedgerMessagingKey` typed
 * message. Because the signed message carries no nonce the signature — and thus
 * the KEK — is deterministic and re-derivable on any device.
 *
 * @param signatureHex - The `0x`-prefixed signature hex returned by the wallet.
 * @returns The 32-byte KEK.
 */
export function deriveKek(signatureHex: string): Uint8Array {
	const signatureBytes = hexToBytes(signatureHex.replace(/^0x/, ""));
	return hkdf(
		sha256,
		signatureBytes,
		textEncoder.encode("TrustLedger-Messaging-KEK-v1"),
		textEncoder.encode("x25519-privkey-wrap"),
		32,
	);
}

/**
 * Wraps a 32-byte private key under the KEK with XChaCha20-Poly1305 and a random
 * 24-byte nonce.
 *
 * @param privateKey - The raw 32-byte X25519 private key to wrap.
 * @param kek - The 32-byte KEK from {@link deriveKek}.
 * @returns The base64 wrapped key and base64 nonce.
 */
export function wrapPrivateKey(privateKey: Uint8Array, kek: Uint8Array): WrappedKey {
	const wrapNonce = randomBytes(24);
	const wrapped = xchacha20poly1305(kek, wrapNonce).encrypt(privateKey);
	return { wrappedPrivateKey: bytesToBase64(wrapped), wrapNonce: bytesToBase64(wrapNonce) };
}

/**
 * Reverses {@link wrapPrivateKey}, recovering the raw 32-byte private key.
 *
 * @param wrappedB64 - Base64 wrapped private key.
 * @param nonceB64 - Base64 wrap nonce.
 * @param kek - The 32-byte KEK from {@link deriveKek}.
 * @returns The unwrapped 32-byte private key.
 * @throws When the KEK is wrong or the ciphertext was tampered with.
 */
export function unwrapPrivateKey(
	wrappedB64: string,
	nonceB64: string,
	kek: Uint8Array,
): Uint8Array {
	return xchacha20poly1305(kek, base64ToBytes(nonceB64)).decrypt(base64ToBytes(wrappedB64));
}

/**
 * Derives the shared, symmetric per-conversation message key for two wallets.
 * Both parties reach the same key thanks to ECDH commutativity and an
 * order-independent salt (the two lowercased addresses sorted ascending), so the
 * sender can also decrypt their own sent messages.
 *
 * @param myPrivateKey - This device's 32-byte X25519 private key.
 * @param theirPublicKey - The peer's 32-byte X25519 public key.
 * @param addrA - One participant's wallet address.
 * @param addrB - The other participant's wallet address.
 * @returns The 32-byte message key.
 */
export function deriveMessageKey(
	myPrivateKey: Uint8Array,
	theirPublicKey: Uint8Array,
	addrA: string,
	addrB: string,
): Uint8Array {
	const shared = x25519.getSharedSecret(myPrivateKey, theirPublicKey);
	const pairSalt = [addrA.toLowerCase(), addrB.toLowerCase()].sort().join(":");
	return hkdf(
		sha256,
		shared,
		textEncoder.encode(pairSalt),
		textEncoder.encode("TrustLedger-Message-v1"),
		32,
	);
}

/**
 * Encrypts a UTF-8 message under the shared message key with a random 24-byte
 * nonce.
 *
 * @param plaintext - The message text.
 * @param messageKey - The 32-byte key from {@link deriveMessageKey}.
 * @returns The base64 ciphertext and base64 nonce.
 */
export function encryptMessage(plaintext: string, messageKey: Uint8Array): EncryptedMessage {
	const nonce = randomBytes(24);
	const ciphertext = xchacha20poly1305(messageKey, nonce).encrypt(textEncoder.encode(plaintext));
	return { ciphertext: bytesToBase64(ciphertext), nonce: bytesToBase64(nonce) };
}

/**
 * Reverses {@link encryptMessage}, recovering the UTF-8 plaintext.
 *
 * @param ciphertextB64 - Base64 ciphertext.
 * @param nonceB64 - Base64 nonce.
 * @param messageKey - The 32-byte key from {@link deriveMessageKey}.
 * @returns The decrypted plaintext.
 * @throws When the key is wrong or the ciphertext/nonce was tampered with.
 */
export function decryptMessage(
	ciphertextB64: string,
	nonceB64: string,
	messageKey: Uint8Array,
): string {
	const plaintext = xchacha20poly1305(messageKey, base64ToBytes(nonceB64)).decrypt(
		base64ToBytes(ciphertextB64),
	);
	return textDecoder.decode(plaintext);
}
