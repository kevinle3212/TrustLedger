import { NextResponse, type NextRequest } from "next/server";
import { createAccountSession } from "@/services/offchainAccounts";

/**
 * `POST /api/accounts/session` — exchanges a signed challenge for a short-lived
 * (30-minute) bearer session token.
 *
 * - **Auth:** none (completes the challenge/response flow).
 * - **Request body (JSON):** `walletAddress` (string, required), `signature`
 *   (`0x`-prefixed string, required) — signature over the issued challenge.
 * - **Responses:**
 *   - `200` `{ token, expiresInSeconds: 1800 }`.
 *   - `400` `{ error }` when required fields are missing.
 *   - `401` `{ error }` when signature verification fails.
 *
 * @param request - Incoming request carrying the JSON body.
 * @returns JSON session token or an error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as { walletAddress?: unknown; signature?: unknown };
	if (typeof body.walletAddress !== "string" || typeof body.signature !== "string")
		return NextResponse.json(
			{ error: "walletAddress and signature are required" },
			{ status: 400 },
		);
	try {
		const token = await createAccountSession({
			walletAddress: body.walletAddress,
			signature: body.signature as `0x${string}`,
		});
		return NextResponse.json({ token, expiresInSeconds: 1800 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "session creation failed" },
			{ status: 401 },
		);
	}
}
