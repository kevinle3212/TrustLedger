import { type NextRequest, NextResponse } from "next/server";
import { type AiMessage, type AiRole, generateText, isAiEnabled } from "@/core/ai";

export const dynamic = "force-dynamic";

/** Upper bounds that cap request cost and blast radius for the open endpoint. */
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 8_000;
const MAX_OUTPUT_TOKENS = 2_000;
const ROLES = new Set<AiRole>(["system", "user", "assistant"]);

/** Validates and narrows an untrusted `messages` payload to typed {@link AiMessage}s. */
function parseMessages(value: unknown): AiMessage[] | null {
	if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) return null;
	const messages: AiMessage[] = [];
	for (const entry of value) {
		if (typeof entry !== "object" || entry === null) return null;
		const record = entry as Record<string, unknown>;
		const role = record["role"];
		const content = record["content"];
		if (typeof role !== "string" || !ROLES.has(role as AiRole)) return null;
		if (typeof content !== "string" || content === "" || content.length > MAX_CONTENT_CHARS)
			return null;
		messages.push({ role: role as AiRole, content });
	}
	return messages;
}

/**
 * `POST /api/ai/complete` — provider-agnostic text completion via `@/core/ai`.
 * The route names no vendor; the router selects the provider/model from config.
 *
 * - **Auth:** none, but gated behind {@link isAiEnabled} so it is inert (503)
 *   until a real provider is configured. Inputs are capped to bound cost.
 * - **Body:** `{ messages: {role, content}[], task?, temperature?, maxOutputTokens? }`.
 * - **Responses:**
 *   - `200` `{ text, provider, model, latencyMs, placeholder, usage? }`.
 *   - `400` `{ error }` on malformed JSON or invalid `messages`.
 *   - `502` `{ error }` when the provider request fails.
 *   - `503` `{ error }` when AI features are not enabled.
 *
 * @param req - Incoming request carrying the JSON completion payload.
 * @returns JSON completion result or an error.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
	if (!isAiEnabled())
		return NextResponse.json({ error: "AI features are not enabled" }, { status: 503 });

	let payload: unknown;
	try {
		payload = await req.json();
	} catch {
		return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
	}

	const record =
		typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
	const messages = parseMessages(record["messages"]);
	if (messages === null)
		return NextResponse.json(
			{ error: `messages must be 1-${String(MAX_MESSAGES)} { role, content } entries` },
			{ status: 400 },
		);

	const task = typeof record["task"] === "string" ? record["task"] : undefined;
	const temperature =
		typeof record["temperature"] === "number" ? record["temperature"] : undefined;
	const requestedTokens =
		typeof record["maxOutputTokens"] === "number" ? record["maxOutputTokens"] : undefined;
	const maxOutputTokens =
		requestedTokens === undefined ? undefined : Math.min(requestedTokens, MAX_OUTPUT_TOKENS);

	try {
		const result = await generateText({
			messages,
			...(task === undefined ? {} : { task }),
			...(temperature === undefined ? {} : { temperature }),
			...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
		});
		return NextResponse.json({
			text: result.text,
			provider: result.provider,
			model: result.model,
			latencyMs: result.latencyMs,
			placeholder: result.placeholder,
			...(result.usage === undefined ? {} : { usage: result.usage }),
		});
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "AI request failed" },
			{ status: 502 },
		);
	}
}
