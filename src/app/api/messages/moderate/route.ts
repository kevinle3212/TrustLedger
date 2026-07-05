import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { moderateMessage } from "@/services/moderation";

/**
 * `POST /api/messages/moderate` — moderates plaintext before the client encrypts
 * it. The text is used transiently and never persisted, so end-to-end encryption
 * is preserved. Fails open (returns `allow`) when AI is disabled.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON):** `text` (string, required) — the plaintext message.
 * - **Responses:**
 *   - `200` `{ decision: "allow" | "flag" | "block", categories: string[], reason? }`.
 *   - `400` `{ error }` when `text` is missing.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @returns JSON response per the contract above.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const body = (await request.json()) as { text?: unknown };
	if (typeof body.text !== "string")
		return NextResponse.json({ error: "text is required" }, { status: 400 });
	return NextResponse.json(await moderateMessage(body.text));
}
