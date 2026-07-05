import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { getOwnKeyBundle } from "@/services/messaging";

/**
 * `GET /api/messages/keys/me` — returns the authenticated wallet's own wrapped
 * messaging key bundle so it can be unwrapped locally with the derived KEK.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Responses:**
 *   - `200` `{ publicKey, wrappedPrivateKey, wrapNonce } | null` — `null` when
 *     the wallet has not registered a key yet.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token.
 * @returns JSON response per the contract above.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	return NextResponse.json(await getOwnKeyBundle(session.walletAddress));
}
