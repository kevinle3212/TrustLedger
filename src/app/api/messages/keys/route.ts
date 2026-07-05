import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { getPublicKey, registerKey } from "@/services/messaging";

/**
 * `POST /api/messages/keys` — registers the authenticated wallet's wrapped
 * messaging identity.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON):** `publicKey`, `wrappedPrivateKey`, `wrapNonce`
 *   (all base64 strings, required).
 * - **Responses:**
 *   - `200` `{ ok: true }`.
 *   - `400` `{ error }` when a field is missing.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @returns JSON response per the contract above.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const body = (await request.json()) as {
		publicKey?: unknown;
		wrappedPrivateKey?: unknown;
		wrapNonce?: unknown;
	};
	if (
		typeof body.publicKey !== "string" ||
		typeof body.wrappedPrivateKey !== "string" ||
		typeof body.wrapNonce !== "string"
	)
		return NextResponse.json(
			{ error: "publicKey, wrappedPrivateKey and wrapNonce are required" },
			{ status: 400 },
		);
	await registerKey(session.walletAddress, {
		publicKey: body.publicKey,
		wrappedPrivateKey: body.wrappedPrivateKey,
		wrapNonce: body.wrapNonce,
	});
	return NextResponse.json({ ok: true });
}

/**
 * `GET /api/messages/keys?wallet=0x…` — returns a peer's public key so the caller
 * can derive a shared conversation key.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Query:** `wallet` — the peer's wallet address (required).
 * - **Responses:**
 *   - `200` `{ publicKey: string | null }`.
 *   - `400` `{ error }` when `wallet` is missing.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token and query.
 * @returns JSON response per the contract above.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const wallet = request.nextUrl.searchParams.get("wallet");
	if (wallet === null || wallet === "")
		return NextResponse.json({ error: "wallet is required" }, { status: 400 });
	return NextResponse.json({ publicKey: await getPublicKey(wallet) });
}
