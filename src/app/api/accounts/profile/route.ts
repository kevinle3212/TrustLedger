import { NextResponse, type NextRequest } from "next/server";
import { getProfile, patchProfile } from "@/controllers/accountProfileController";

/**
 * Extracts a bearer token from the `Authorization` header.
 *
 * @param request - Incoming request.
 * @returns The token without the `Bearer ` prefix, or `null` when absent or
 *   malformed.
 */
function bearer(request: NextRequest): string | null {
	const header = request.headers.get("authorization");
	if (header?.startsWith("Bearer ") !== true) return null;
	return header.slice("Bearer ".length);
}

/**
 * `GET /api/accounts/profile` — returns the off-chain profile for the
 * authenticated wallet.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>` issued by
 *   `POST /api/accounts/session`.
 * - **Request:** no body or query parameters.
 * - **Responses:**
 *   - `200` `{ profile: AccountProfile | null }`
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token.
 * @returns JSON response per the contract above.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const result = await getProfile(bearer(request));
	return NextResponse.json(result.body, { status: result.status });
}

/**
 * `PATCH /api/accounts/profile` — updates whitelisted fields of the
 * authenticated wallet's off-chain profile.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON, all optional):** `displayName` (string, ≤ 80),
 *   `avatarUrl` (string, ≤ 300), `email` (string, ≤ 254), `onboardingComplete`
 *   (boolean), `notificationsEnabled` (boolean), `inactivityTimeoutMs` (integer
 *   in `[60000, 86400000]`, or `null` for the app default). Unknown fields are
 *   ignored; a present-but-invalid field is rejected with `400`.
 * - **Responses:**
 *   - `200` `{ profile: AccountProfile }` — updated profile.
 *   - `400` `{ error }` — a provided field failed validation.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @returns JSON response per the contract above.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as Record<string, unknown>;
	const result = await patchProfile(bearer(request), body);
	return NextResponse.json(result.body, { status: result.status });
}
