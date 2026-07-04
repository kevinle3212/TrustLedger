import { type NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, type MagicLinkPayload } from "@/lib/magicLink";

/**
 * `GET /api/magic-link/verify?token=...` — verifies a magic-link token and
 * returns its decoded payload.
 *
 * - **Auth:** none; security is the signed, expiring token itself.
 * - **Query:** `token` (string, required) — the signed magic-link token.
 * - **Responses:**
 *   - `200` `{ ok: true, payload }` for a valid token.
 *   - `400` `{ error: "token required" }` when the token is missing.
 *   - `401` `{ error }` for an invalid or expired token.
 *   - `500` when `MAGIC_LINK_SECRET` is unset.
 *
 * @param req - Incoming request carrying the `token` query param.
 * @returns JSON payload or an error.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
	const secret = process.env.MAGIC_LINK_SECRET;
	if (secret === undefined || secret === "")
		return NextResponse.json({ error: "MAGIC_LINK_SECRET not set" }, { status: 500 });

	const token = req.nextUrl.searchParams.get("token");
	if (token === null) return NextResponse.json({ error: "token required" }, { status: 400 });

	let payload: MagicLinkPayload;
	try {
		payload = await verifyMagicToken(token, secret);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "invalid token" },
			{ status: 401 },
		);
	}

	return NextResponse.json({ ok: true, payload });
}
