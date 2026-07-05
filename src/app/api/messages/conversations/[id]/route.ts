import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { appendMessage, getMessages } from "@/services/messaging";

/** Maps a participant-gating failure to a 403, other errors to a 500. */
function errorStatus(error: unknown): number {
	return error instanceof Error && error.message === "Not a participant of this conversation."
		? 403
		: 500;
}

/**
 * `GET /api/messages/conversations/[id]` — returns a conversation's encrypted
 * messages. Participant-gated.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Path params:** `id` — conversation id.
 * - **Responses:**
 *   - `200` `{ messages: [{ id, senderAddress, ciphertext, nonce, moderationFlag,
 *     moderationCategories, createdAt, readAt }] }`.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *   - `403` `{ error }` — the caller is not a participant.
 *
 * @param request - Incoming request carrying the bearer token.
 * @param context - Route context whose `params` resolves to `{ id }`.
 * @returns JSON response per the contract above.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const { id } = await params;
	try {
		return NextResponse.json({ messages: await getMessages(session.walletAddress, id) });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "failed to load messages" },
			{ status: errorStatus(error) },
		);
	}
}

/**
 * `POST /api/messages/conversations/[id]` — appends an encrypted message to a
 * conversation and bumps its activity timestamp. Participant-gated.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Path params:** `id` — conversation id.
 * - **Request body (JSON):** `ciphertext` (string, required), `nonce` (string,
 *   required), `moderationFlag` (string, optional), `moderationCategories`
 *   (string[], optional).
 * - **Responses:**
 *   - `200` `{ id }` — the new message id.
 *   - `400` `{ error }` when a required field is missing.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *   - `403` `{ error }` — the caller is not a participant.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @param context - Route context whose `params` resolves to `{ id }`.
 * @returns JSON response per the contract above.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const { id } = await params;
	const body = (await request.json()) as {
		ciphertext?: unknown;
		nonce?: unknown;
		moderationFlag?: unknown;
		moderationCategories?: unknown;
	};
	if (typeof body.ciphertext !== "string" || typeof body.nonce !== "string")
		return NextResponse.json({ error: "ciphertext and nonce are required" }, { status: 400 });
	try {
		const messageId = await appendMessage(session.walletAddress, id, {
			ciphertext: body.ciphertext,
			nonce: body.nonce,
			...(typeof body.moderationFlag === "string"
				? { moderationFlag: body.moderationFlag }
				: {}),
			...(Array.isArray(body.moderationCategories)
				? {
						moderationCategories: body.moderationCategories.filter(
							(category): category is string => typeof category === "string",
						),
					}
				: {}),
		});
		return NextResponse.json({ id: messageId });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "failed to append message" },
			{ status: errorStatus(error) },
		);
	}
}
