// Client-side AES-256-GCM encryption using the browser's native Web Crypto API.
// The encrypted output is a self-describing JSON bundle so decryption parameters
// travel with the ciphertext — no side-channel needed to recover them.

type EncryptedBundle = {
	v: 1;
	alg: "AES-256-GCM";
	kdf: "PBKDF2-SHA256";
	iter: number;
	salt: string;
	iv: string;
	ct: string;
};

const ITERATIONS = 100_000;

function toHex(buf: ArrayBuffer | Uint8Array): string {
	return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	const raw = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		raw,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

// Encrypt arbitrary bytes with a passphrase.
// Returns a UTF-8 JSON bundle (Uint8Array) that can be uploaded directly to IPFS.
export async function encryptFile(data: ArrayBuffer, passphrase: string): Promise<Uint8Array<ArrayBuffer>> {
	// Allocate first (Uint8Array<ArrayBuffer>), then fill in-place so TypeScript
	// keeps the narrower ArrayBuffer type rather than the broader ArrayBufferLike
	// returned by the getRandomValues overload signature.
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);
	const iv = new Uint8Array(12);
	crypto.getRandomValues(iv);
	const key = await deriveKey(passphrase, salt);
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
	return new TextEncoder().encode(JSON.stringify(bundle)) as Uint8Array<ArrayBuffer>;
}

// Decrypt a bundle produced by encryptFile.
export async function decryptFile(data: ArrayBuffer, passphrase: string): Promise<ArrayBuffer> {
	const bundle = JSON.parse(new TextDecoder().decode(data)) as EncryptedBundle;
	if (bundle.v !== 1) throw new Error("Unsupported encryption bundle version");

	const salt = fromHex(bundle.salt);
	const iv = fromHex(bundle.iv);
	// Wrap in new Uint8Array() to ensure Uint8Array<ArrayBuffer> for Web Crypto.
	const ct = new Uint8Array(Uint8Array.from(atob(bundle.ct), (c) => c.charCodeAt(0)));
	const key = await deriveKey(passphrase, salt);
	return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
}
