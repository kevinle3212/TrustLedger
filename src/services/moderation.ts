import "server-only";

import { generateText, isAiEnabled, type AiMessage } from "@/core/ai";

/**
 * AI moderation for outbound messages. Plaintext is moderated in this transient
 * server call and never persisted; the client encrypts the message afterward, so
 * end-to-end encryption is preserved. Moderation is advisory flagging, not a hard
 * availability gate — it fails open (returns `allow`) whenever AI is disabled or
 * the call/parse fails. Server-only.
 */

/** The fixed set of moderation categories the model may return. */
const MODERATION_CATEGORIES = [
	"harassment",
	"personal_info",
	"off_platform_contact",
	"spam",
	"threat",
	"other",
] as const;

/** The moderation outcome for a message. */
export interface ModerationResult {
	readonly decision: "allow" | "flag" | "block";
	readonly categories: string[];
	readonly reason?: string;
}

const SYSTEM_PROMPT = [
	"You are a strict content moderator for a freelance escrow platform's private messaging.",
	"Classify the user message and respond with ONLY a JSON object, no prose, of the form:",
	'{"decision":"allow"|"flag"|"block","categories":string[],"reason"?:string}.',
	`Each category MUST be one of: ${MODERATION_CATEGORIES.join(", ")}.`,
	'Use "block" for threats, harassment, or attempts to move payment off-platform to defraud;',
	'"flag" for sharing personal contact info, spam, or milder issues; "allow" for normal messages.',
	'When "allow", return an empty categories array and omit reason.',
].join(" ");

/** Coerces an unknown parsed value into a safe {@link ModerationResult}. */
function coerceResult(parsed: unknown): ModerationResult {
	if (parsed === null || typeof parsed !== "object") return { decision: "allow", categories: [] };
	const record = parsed as Record<string, unknown>;
	const rawDecision = record["decision"];
	const decision = rawDecision === "flag" || rawDecision === "block" ? rawDecision : "allow";
	const rawCategories = record["categories"];
	const categories = Array.isArray(rawCategories)
		? rawCategories.filter(
				(category): category is string =>
					typeof category === "string" &&
					(MODERATION_CATEGORIES as readonly string[]).includes(category),
			)
		: [];
	const rawReason = record["reason"];
	const reason = typeof rawReason === "string" ? rawReason : undefined;
	return {
		decision,
		categories,
		...(reason === undefined ? {} : { reason }),
	};
}

/**
 * Extracts a JSON object from model output that may be wrapped in prose or a code
 * fence, returning the parsed value or `null`.
 */
function parseJsonObject(text: string): unknown {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end === -1 || end < start) return null;
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return null;
	}
}

/**
 * Moderates a plaintext message. Fails open: returns `{ decision: "allow",
 * categories: [] }` when AI is disabled or the provider call/parse fails.
 *
 * @param text - The plaintext message to moderate. Never persisted.
 * @returns The moderation decision, matched categories, and optional reason.
 */
export async function moderateMessage(text: string): Promise<ModerationResult> {
	if (!isAiEnabled()) return { decision: "allow", categories: [] };
	const messages: AiMessage[] = [
		{ role: "system", content: SYSTEM_PROMPT },
		{ role: "user", content: text },
	];
	try {
		const result = await generateText({ messages, task: "moderation", temperature: 0 });
		const parsed = parseJsonObject(result.text);
		if (parsed === null) return { decision: "allow", categories: [] };
		return coerceResult(parsed);
	} catch {
		return { decision: "allow", categories: [] };
	}
}
