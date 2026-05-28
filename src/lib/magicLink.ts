// Magic link tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
// Stateless - single-use enforcement relies on on-chain status (PENDING → ACTIVE is irreversible).
//
// Why HMAC instead of JWT? HMAC-SHA256 via the Web Crypto API runs in both the browser
// and the Next.js API route (Edge/Node), so we avoid importing a server-only JWT library.
// The "."-joined format is intentionally JWT-like but simpler: no header segment, just payload.sig.

export interface MagicLinkPayload {
	contractId: string;
	freelancerEmail: string;
	freelancerAddress: string;
	nonce: string; // random UUID included so two tokens for the same contract are never identical
	exp: number; // unix seconds — checked in verifyMagicToken
}

// Convert an ArrayBuffer to URL-safe base64 (no +, /, or = padding).
// Standard base64 uses + and / which are percent-encoded in URLs; the URL-safe variant
// replaces them with - and _ and strips the = padding so links stay clean.
function b64url(buf: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buf)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

// Reverse of b64url: restore standard base64 chars, re-add padding, then decode.
// padEnd brings the length to the next multiple of 4 — atob requires exact padding.
function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
	const padded = s
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
	return new Uint8Array(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer);
}

// Import a raw string as a CryptoKey for HMAC-SHA256.
// extractable: false means the key bytes can never be exported back out of the crypto engine —
// the browser holds it opaquely, so even if JS is compromised the raw secret stays hidden.
async function importKey(secret: string): Promise<CryptoKey> {
	return await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false, // not extractable
		["sign", "verify"],
	);
}

// Produce a token = base64url(payload) + "." + base64url(HMAC(payload)).
// Signing only the serialized payload (not re-encoding it) means verification can
// split on the last "." and verify the raw bytes without a second serialization round-trip.
export async function signMagicToken(payload: MagicLinkPayload, secret: string): Promise<string> {
	const header = b64url(new TextEncoder().encode(JSON.stringify(payload)).buffer);
	const key = await importKey(secret);
	const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(header));
	return `${header}.${b64url(sig)}`;
}

// Verify signature, then check expiry. Throws on any failure so callers can catch and reject.
// crypto.subtle.verify() does constant-time comparison internally, preventing timing attacks
// where an attacker learns the correct signature one byte at a time by measuring response time.
export async function verifyMagicToken(token: string, secret: string): Promise<MagicLinkPayload> {
	const dot = token.lastIndexOf(".");
	if (dot === -1) throw new Error("malformed token");
	const header = token.slice(0, dot);
	const sig = b64urlDecode(token.slice(dot + 1));
	const key = await importKey(secret);
	const valid = await crypto.subtle.verify(
		"HMAC",
		key,
		sig.buffer,
		new TextEncoder().encode(header),
	);
	if (!valid) throw new Error("invalid signature");
	const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(header))) as MagicLinkPayload;
	if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("token expired");
	return payload;
}
