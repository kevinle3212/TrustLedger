// Magic link tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
// Stateless — single-use enforcement relies on on-chain status (PENDING → ACTIVE is irreversible).

export interface MagicLinkPayload {
	contractId: string;
	freelancerEmail: string;
	freelancerAddress: string;
	nonce: string;
	exp: number; // unix seconds
}

function b64url(buf: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buf)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
	const padded = s
		.replace(/-/g, "+")
		.replace(/_/g, "/")
		.padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
	return new Uint8Array(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer);
}

async function importKey(secret: string): Promise<CryptoKey> {
	return await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

export async function signMagicToken(payload: MagicLinkPayload, secret: string): Promise<string> {
	const header = b64url(new TextEncoder().encode(JSON.stringify(payload)).buffer);
	const key = await importKey(secret);
	const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(header));
	return `${header}.${b64url(sig)}`;
}

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
