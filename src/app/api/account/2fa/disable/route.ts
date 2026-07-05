import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { disable } from "@/services/totp";

/**
 * `POST /api/account/2fa/disable` — disables TOTP two-factor for the
 * authenticated wallet after verifying a TOTP or recovery code.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON):** `code` (string, required) — a valid TOTP code or an
 *   unused recovery code.
 * - **Responses:**
 *   - `200` `{ enabled: false }`.
 *   - `400` `{ error }` when `code` is missing or invalid, or 2FA is not enabled.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @returns JSON response per the contract above.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const body = (await request.json()) as { code?: unknown };
	if (typeof body.code !== "string")
		return NextResponse.json({ error: "code is required" }, { status: 400 });
	try {
		await disable(session.walletAddress, body.code);
		return NextResponse.json({ enabled: false });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "disable failed" },
			{ status: 400 },
		);
	}
}
