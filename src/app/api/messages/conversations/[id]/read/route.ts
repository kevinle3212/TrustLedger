import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { markRead } from "@/services/messaging";

/**
 * `POST /api/messages/conversations/[id]/read` — marks a conversation's inbound
 * messages read for the authenticated wallet. Participant-gated.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Path params:** `id` — conversation id.
 * - **Responses:**
 *   - `200` `{ ok: true }`.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *   - `403` `{ error }` — the caller is not a participant.
 *
 * @param request - Incoming request carrying the bearer token.
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
	try {
		await markRead(session.walletAddress, id);
		return NextResponse.json({ ok: true });
	} catch (error) {
		const notParticipant =
			error instanceof Error && error.message === "Not a participant of this conversation.";
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "failed to mark read" },
			{ status: notParticipant ? 403 : 500 },
		);
	}
}
