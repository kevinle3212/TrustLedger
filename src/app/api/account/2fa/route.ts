import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { isEnabled } from "@/services/totp";

/**
 * `GET /api/account/2fa` — reports whether TOTP two-factor is enabled for the
 * authenticated wallet.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Responses:**
 *   - `200` `{ enabled: boolean }`.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token.
 * @returns JSON response per the contract above.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	return NextResponse.json({ enabled: await isEnabled(session.walletAddress) });
}
