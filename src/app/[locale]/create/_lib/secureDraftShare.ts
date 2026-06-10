import type { CreateState } from "./types";

const SHARE_PARAM = "tl_draft";
const ROOM_PARAM = "tl_room";
const SHARE_VERSION = 1;
const ITERATIONS = 100_000;

export interface ShareableDraft {
	readonly proposerRole: CreateState["proposerRole"];
	readonly paymentToken: CreateState["paymentToken"];
	readonly form: CreateState["form"];
	readonly docMode: CreateState["docMode"];
	readonly encryptEnabled: CreateState["encryptEnabled"];
	readonly termsBody: CreateState["termsBody"];
	readonly termsFormat: CreateState["termsFormat"];
	readonly termsLastUpdatedAt: CreateState["termsLastUpdatedAt"];
}

interface ShareEnvelope {
	readonly v: typeof SHARE_VERSION;
	readonly alg: "AES-256-GCM";
	readonly kdf: "PBKDF2-SHA256";
	readonly iter: typeof ITERATIONS;
	readonly salt: string;
	readonly iv: string;
	readonly ct: string;
	readonly allowedWallets: readonly string[];
	readonly updatedAt: string;
}

interface ParsedShareEnvelope {
	readonly v?: unknown;
	readonly alg?: unknown;
	readonly kdf?: unknown;
	readonly iter?: unknown;
	readonly salt?: unknown;
	readonly iv?: unknown;
	readonly ct?: unknown;
	readonly allowedWallets?: unknown;
	readonly updatedAt?: unknown;
}

function toBase64Url(bytes: Uint8Array): string {
	return btoa(String.fromCharCode(...bytes))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
	const source = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
	const output = new Uint8Array(source.length);
	output.set(source);
	return output;
}

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
	const output = new Uint8Array(hex.length / 2);
	for (let index = 0; index < output.length; index += 1) {
		output[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
	}
	return output;
}

function normalizedWallets(wallets: readonly string[]): string[] {
	const normalized = new Set<string>();
	for (const wallet of wallets) {
		const trimmed = wallet.trim().toLowerCase();
		if (/^0x[0-9a-f]{40}$/.test(trimmed)) {
			normalized.add(trimmed);
		}
	}
	return [...normalized];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isTermsFormat(value: unknown): value is CreateState["termsFormat"] {
	return value === "markdown" || value === "html" || value === "plain";
}

function isDocMode(value: unknown): value is CreateState["docMode"] {
	return value === "upload" || value === "manual";
}

function isHoldBack(value: unknown): value is CreateState["form"]["holdBack"] {
	return value === "none" || value === "5" || value === "10" || value === "15";
}

function isForm(value: unknown): value is CreateState["form"] {
	if (!isRecord(value)) return false;
	return (
		typeof value["client"] === "string" &&
		typeof value["clientEmail"] === "string" &&
		typeof value["amount"] === "string" &&
		typeof value["contractURI"] === "string" &&
		typeof value["estimatedDurationDays"] === "string" &&
		typeof value["bufferFactor"] === "string" &&
		typeof value["acceptanceWindowDays"] === "string" &&
		typeof value["arbitrationFeePct"] === "string" &&
		isHoldBack(value["holdBack"]) &&
		typeof value["warrantyPeriodDays"] === "string"
	);
}

function isShareableDraft(value: unknown): value is ShareableDraft {
	if (!isRecord(value)) return false;
	return (
		(value["proposerRole"] === "client" || value["proposerRole"] === "freelancer") &&
		(value["paymentToken"] === "eth" || value["paymentToken"] === "usdc") &&
		isForm(value["form"]) &&
		isDocMode(value["docMode"]) &&
		typeof value["encryptEnabled"] === "boolean" &&
		typeof value["termsBody"] === "string" &&
		isTermsFormat(value["termsFormat"]) &&
		(value["termsLastUpdatedAt"] === null || typeof value["termsLastUpdatedAt"] === "string")
	);
}

async function deriveKey(sessionKey: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
	const raw = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(sessionKey),
		"PBKDF2",
		false,
		["deriveKey"],
	);
	return await crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
		raw,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

function parseEnvelope(encryptedDraft: string): ShareEnvelope {
	const parsed = JSON.parse(
		new TextDecoder().decode(fromBase64Url(encryptedDraft)),
	) as ParsedShareEnvelope;
	if (
		parsed.v !== SHARE_VERSION ||
		parsed.alg !== "AES-256-GCM" ||
		parsed.kdf !== "PBKDF2-SHA256" ||
		parsed.iter !== ITERATIONS ||
		typeof parsed.salt !== "string" ||
		typeof parsed.iv !== "string" ||
		typeof parsed.ct !== "string" ||
		!Array.isArray(parsed.allowedWallets) ||
		typeof parsed.updatedAt !== "string"
	) {
		throw new Error("Unsupported draft share format.");
	}

	return {
		v: SHARE_VERSION,
		alg: "AES-256-GCM",
		kdf: "PBKDF2-SHA256",
		iter: ITERATIONS,
		salt: parsed.salt,
		iv: parsed.iv,
		ct: parsed.ct,
		allowedWallets: normalizedWallets(
			parsed.allowedWallets.flatMap((wallet) => (typeof wallet === "string" ? [wallet] : [])),
		),
		updatedAt: parsed.updatedAt,
	};
}

export function shareableDraftFromState(state: CreateState): ShareableDraft {
	return {
		proposerRole: state.proposerRole,
		paymentToken: state.paymentToken,
		form: state.form,
		docMode: state.docMode,
		encryptEnabled: state.encryptEnabled,
		termsBody: state.termsBody,
		termsFormat: state.termsFormat,
		termsLastUpdatedAt: state.termsLastUpdatedAt,
	};
}

export function generateSessionKey(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

export function generateRoomId(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

export async function encryptDraftForShare(input: {
	readonly draft: ShareableDraft;
	readonly sessionKey: string;
	readonly allowedWallets: readonly string[];
}): Promise<string> {
	const salt = new Uint8Array(16);
	const iv = new Uint8Array(12);
	crypto.getRandomValues(salt);
	crypto.getRandomValues(iv);
	const key = await deriveKey(input.sessionKey, salt);
	const plaintext = new TextEncoder().encode(JSON.stringify(input.draft));
	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
	const envelope: ShareEnvelope = {
		v: SHARE_VERSION,
		alg: "AES-256-GCM",
		kdf: "PBKDF2-SHA256",
		iter: ITERATIONS,
		salt: toHex(salt),
		iv: toHex(iv),
		ct: toBase64Url(new Uint8Array(ciphertext)),
		allowedWallets: normalizedWallets(input.allowedWallets),
		updatedAt: new Date().toISOString(),
	};
	return toBase64Url(new TextEncoder().encode(JSON.stringify(envelope)));
}

export function buildDraftShareUrl(encryptedDraft: string, roomId: string | null = null): string {
	const url = new URL(window.location.href);
	url.searchParams.set(SHARE_PARAM, encryptedDraft);
	if (roomId !== null) {
		url.searchParams.set(ROOM_PARAM, roomId);
	}
	url.hash = "";
	return url.toString();
}

export function getEncryptedDraftFromUrl(): string | null {
	if (typeof window === "undefined") return null;
	return new URL(window.location.href).searchParams.get(SHARE_PARAM);
}

export function getDraftRoomFromUrl(): string | null {
	if (typeof window === "undefined") return null;
	const roomId = new URL(window.location.href).searchParams.get(ROOM_PARAM);
	return roomId !== null && /^[A-Za-z0-9_-]{12,80}$/.test(roomId) ? roomId : null;
}

export function inspectAllowedWallets(encryptedDraft: string): readonly string[] {
	try {
		return parseEnvelope(encryptedDraft).allowedWallets;
	} catch {
		return [];
	}
}

export async function decryptSharedDraft(input: {
	readonly encryptedDraft: string;
	readonly sessionKey: string;
	readonly walletAddress: string | undefined;
}): Promise<ShareableDraft> {
	const envelope = parseEnvelope(input.encryptedDraft);
	const walletAddress = input.walletAddress?.toLowerCase();
	if (
		envelope.allowedWallets.length > 0 &&
		(walletAddress === undefined || !envelope.allowedWallets.includes(walletAddress))
	) {
		throw new Error("Connect an allowed wallet before importing this draft.");
	}
	const key = await deriveKey(input.sessionKey, fromHex(envelope.salt));
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromHex(envelope.iv) },
		key,
		fromBase64Url(envelope.ct),
	);
	const draft = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
	if (!isShareableDraft(draft)) {
		throw new Error("This draft is encrypted correctly but has an unsupported shape.");
	}
	return draft;
}
