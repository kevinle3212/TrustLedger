import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { getOrCreateConversation, listConversations } from "@/services/messaging";

/**
 * `GET /api/messages/conversations` — lists the authenticated wallet's
 * conversations, most recently active first.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Responses:**
 *   - `200` `{ conversations: [{ id, peer, lastMessageAt, unread }] }`.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token.
 * @returns JSON response per the contract above.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	return NextResponse.json({ conversations: await listConversations(session.walletAddress) });
}

/**
 * `POST /api/messages/conversations` — opens (or returns the existing)
 * conversation between the authenticated wallet and a peer.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON):** `peerAddress` (string, required), `contractId`
 *   (string, optional).
 * - **Responses:**
 *   - `200` `{ id }`.
 *   - `400` `{ error }` when `peerAddress` is missing.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @returns JSON response per the contract above.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const body = (await request.json()) as { peerAddress?: unknown; contractId?: unknown };
	if (typeof body.peerAddress !== "string")
		return NextResponse.json({ error: "peerAddress is required" }, { status: 400 });
	const id = await getOrCreateConversation(
		session.walletAddress,
		body.peerAddress,
		typeof body.contractId === "string" ? body.contractId : undefined,
	);
	return NextResponse.json({ id });
}
