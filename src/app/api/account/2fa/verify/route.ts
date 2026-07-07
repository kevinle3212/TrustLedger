import { NextResponse, type NextRequest } from "next/server";

import {
	ACCOUNT_SECURITY_RETRY_AFTER_SECONDS,
	isAccountSecurityRateLimited,
} from "@/security/accountRateLimit";
import { sessionFromRequest } from "@/services/accountRequest";
import { confirmSetup } from "@/services/totp";

/**
 * `POST /api/account/2fa/verify` — confirms TOTP enrollment by verifying a code,
 * enabling 2FA, and returning the one-time recovery codes (shown once).
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON):** `code` (string, required) — current 6-digit code.
 * - **Responses:**
 *   - `200` `{ enabled: true, recoveryCodes: string[] }`.
 *   - `400` `{ error }` when `code` is missing or invalid, or no setup is pending.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *   - `429` `{ error }` when the wallet exceeds the verification attempt limit.
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
	if (isAccountSecurityRateLimited(session.walletAddress)) {
		const response = NextResponse.json(
			{ error: "too many two-factor verification attempts" },
			{ status: 429 },
		);
		response.headers.set("Retry-After", String(ACCOUNT_SECURITY_RETRY_AFTER_SECONDS));
		return response;
	}
	try {
		const recoveryCodes = await confirmSetup(session.walletAddress, body.code);
		return NextResponse.json({ enabled: true, recoveryCodes });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "verification failed" },
			{ status: 400 },
		);
	}
}
