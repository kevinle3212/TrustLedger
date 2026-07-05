import { NextResponse, type NextRequest } from "next/server";

import { sessionFromRequest } from "@/services/accountRequest";
import { beginSetup } from "@/services/totp";

/**
 * `POST /api/account/2fa/setup` — begins TOTP enrollment for the authenticated
 * wallet, returning the provisioning URI (for the QR code) and the raw secret
 * (for manual entry). The credential is stored disabled until confirmed.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Responses:**
 *   - `200` `{ otpauthUri: string, secret: string }`.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token.
 * @returns JSON response per the contract above.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	return NextResponse.json(await beginSetup(session.walletAddress));
}
