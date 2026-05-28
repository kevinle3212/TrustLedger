// Client-side AES-256-GCM encryption using the browser's native Web Crypto API.
// The encrypted output is a self-describing JSON bundle so decryption parameters
// travel with the ciphertext - no side-channel needed to recover them.
//
// Flow: passphrase + random salt → PBKDF2 → 256-bit AES key → GCM encrypt(data, random IV)
// The salt, IV, and ciphertext are all stored in one JSON blob uploaded to IPFS.

interface EncryptedBundle {
	v: number; // schema version — lets us change the format later without breaking old bundles
	alg: "AES-256-GCM";
	kdf: "PBKDF2-SHA256";
	iter: number; // PBKDF2 iteration count (stored so future versions can increase it)
	salt: string; // hex-encoded 16-byte random salt (unique per encryption)
	iv: string; // hex-encoded 12-byte random IV (GCM standard recommendation)
	ct: string; // base64-encoded ciphertext + 16-byte GCM authentication tag
}

// 100 000 iterations is the OWASP minimum recommendation for PBKDF2-SHA256 (2023).
// Higher iterations slow down offline brute-force attacks against weak passphrases.
const ITERATIONS = 100_000;

// Convert raw bytes to a hex string for JSON serialization.
// Hex is used (instead of base64) for salt and IV because they're short fixed-length
// values and hex is easier to read/debug; the larger ciphertext uses base64 to stay compact.
function toHex(buf: ArrayBuffer | Uint8Array): string {
	return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// Reverse of toHex: parse two hex chars at a time into a byte array.
function fromHex(hex: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

// Derive a 256-bit AES-GCM key from a passphrase + salt using PBKDF2.
// PBKDF2 (Password-Based Key Derivation Function 2) is a standard algorithm that
// intentionally runs many hash iterations to make brute-force guessing expensive.
// A unique random salt ensures two encryptions with the same passphrase produce
// different keys, preventing precomputed rainbow-table attacks.
async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	// Step 1: import the passphrase as raw key material (not a usable key yet).
	const raw = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	// Step 2: stretch it into a proper AES-256 key via PBKDF2-SHA256.
	return await crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		raw,
		{ name: "AES-GCM", length: 256 },
		false, // not extractable — key stays inside the crypto engine
		["encrypt", "decrypt"],
	);
}

// Encrypt arbitrary bytes with a passphrase.
// Returns a UTF-8 JSON bundle (Uint8Array) that can be uploaded directly to IPFS.
export async function encryptFile(
	data: ArrayBuffer,
	passphrase: string,
): Promise<Uint8Array<ArrayBuffer>> {
	// Allocate first (Uint8Array<ArrayBuffer>), then fill in-place so TypeScript
	// keeps the narrower ArrayBuffer type rather than the broader ArrayBufferLike
	// returned by the getRandomValues overload signature.
	const salt = new Uint8Array(16); // 128-bit salt — unique per file
	crypto.getRandomValues(salt);
	const iv = new Uint8Array(12); // 96-bit IV — GCM's recommended size; never reuse with the same key
	crypto.getRandomValues(iv);
	const key = await deriveKey(passphrase, salt);
	// AES-GCM appends a 16-byte authentication tag to the ciphertext automatically.
	// This tag lets decryptFile detect if either the passphrase or the ciphertext bytes were altered.
	const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

	const bundle: EncryptedBundle = {
		v: 1,
		alg: "AES-256-GCM",
		kdf: "PBKDF2-SHA256",
		iter: ITERATIONS,
		salt: toHex(salt),
		iv: toHex(iv),
		ct: btoa(String.fromCharCode(...new Uint8Array(ct))),
	};
	// TextEncoder.encode allocates its own ArrayBuffer, giving Uint8Array<ArrayBuffer>.
	return new TextEncoder().encode(JSON.stringify(bundle));
}

// Decrypt a bundle produced by encryptFile.
// Complete and tested-safe, but not yet wired into any UI - kept as the symmetric
// counterpart to encryptFile for a future deliverable download/decrypt flow (e.g. a
// freelancer or juror retrieving and decrypting an encrypted artifact from IPFS).
export async function decryptFile(data: ArrayBuffer, passphrase: string): Promise<ArrayBuffer> {
	const bundle = JSON.parse(new TextDecoder().decode(data)) as EncryptedBundle;
	if (bundle.v !== 1) throw new Error("Unsupported encryption bundle version");

	const salt = fromHex(bundle.salt);
	const iv = fromHex(bundle.iv);
	// Wrap in new Uint8Array() to ensure Uint8Array<ArrayBuffer> for Web Crypto.
	const ct = new Uint8Array(Uint8Array.from(atob(bundle.ct), (c) => c.charCodeAt(0)));
	const key = await deriveKey(passphrase, salt);
	// If the passphrase is wrong or the ciphertext was tampered, GCM authentication fails
	// and subtle.decrypt throws a DOMException("OperationError") — caught by the UI above.
	return await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
}
