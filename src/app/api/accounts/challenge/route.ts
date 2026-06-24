import { NextResponse, type NextRequest } from "next/server";
import { createAccountChallenge } from "@/services/offchainAccounts";

/**
 * `POST /api/accounts/challenge` — issues an EIP-712 challenge a wallet must
 * sign to prove address ownership before a session is created.
 *
 * - **Auth:** none (this is the first step of authentication).
 * - **Request body (JSON):** `address` (string, required) — wallet address.
 * - **Responses:**
 *   - `200` challenge payload to sign.
 *   - `400` `{ error }` when `address` is missing or invalid.
 *
 * @param request - Incoming request carrying the JSON body.
 * @returns JSON challenge payload or an error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as { address?: unknown };
	if (typeof body.address !== "string")
		return NextResponse.json({ error: "address is required" }, { status: 400 });
	try {
		return NextResponse.json(createAccountChallenge(body.address));
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "invalid challenge request" },
			{ status: 400 },
		);
	}
}
