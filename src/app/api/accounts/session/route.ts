import { NextResponse, type NextRequest } from "next/server";
import { createAccountSession } from "@/services/offchainAccounts";

/**
 * `POST /api/accounts/session` — exchanges a signed challenge for a short-lived
 * (30-minute) bearer session token.
 *
 * - **Auth:** none (completes the challenge/response flow).
 * - **Request body (JSON):** `walletAddress` (string, required), `signature`
 *   (`0x`-prefixed string, required) — signature over the issued challenge —
 *   and `totpCode` (string, optional) — required when the wallet has TOTP 2FA
 *   enabled.
 * - **Responses:**
 *   - `200` `{ token, expiresInSeconds: 1800 }`.
 *   - `400` `{ error }` when required fields are missing.
 *   - `401` `{ error: "Two-factor code required", totpRequired: true }` when 2FA
 *     is enabled but no `totpCode` was supplied.
 *   - `401` `{ error }` when signature or two-factor verification fails.
 *
 * @param request - Incoming request carrying the JSON body.
 * @returns JSON session token or an error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as {
		walletAddress?: unknown;
		signature?: unknown;
		totpCode?: unknown;
	};
	if (typeof body.walletAddress !== "string" || typeof body.signature !== "string")
		return NextResponse.json(
			{ error: "walletAddress and signature are required" },
			{ status: 400 },
		);
	try {
		const token = await createAccountSession({
			walletAddress: body.walletAddress,
			signature: body.signature as `0x${string}`,
			...(typeof body.totpCode === "string" ? { totpCode: body.totpCode } : {}),
		});
		return NextResponse.json({ token, expiresInSeconds: 1800 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "session creation failed";
		if (message === "TOTP_REQUIRED")
			return NextResponse.json(
				{ error: "Two-factor code required", totpRequired: true },
				{ status: 401 },
			);
		return NextResponse.json({ error: message }, { status: 401 });
	}
}
