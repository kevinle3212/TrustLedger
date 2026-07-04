import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured, notifications } from "@/lib/db";
import { verifyAccountSession } from "@/services/offchainAccounts";

// GET/POST /api/notifications/inbox
//
// Per-wallet in-app notification feed backed by the off-chain database. Both
// handlers are gated to the authenticated wallet via the account session token
// (same bearer scheme as /api/accounts/profile). When the database is not
// configured the feed is simply empty and nothing can be marked read.

export const dynamic = "force-dynamic"; // per-wallet, never cache

/** How many notifications a single inbox fetch returns, newest first. */
const INBOX_LIMIT = 50;

/**
 * Extracts a bearer token from the `Authorization` header.
 *
 * @param request - Incoming request.
 * @returns The token without the `Bearer ` prefix, or `null` when absent.
 */
function bearer(request: NextRequest): string | null {
	const header = request.headers.get("authorization");
	if (header?.startsWith("Bearer ") !== true) return null;
	return header.slice("Bearer ".length);
}

/**
 * `GET /api/notifications/inbox` — returns the authenticated wallet's most
 * recent in-app notifications.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Responses:**
 *   - `200` `{ notifications: Notification[] }` newest-first (max 50). Empty
 *     when the off-chain database is not configured.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *
 * @param request - Incoming request carrying the bearer token.
 * @returns JSON response per the contract above.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	const session = verifyAccountSession(bearer(request));
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	if (!isDatabaseConfigured()) return NextResponse.json({ notifications: [] });
	const inbox = await notifications.listByWallet(session.walletAddress, INBOX_LIMIT);
	return NextResponse.json({ notifications: inbox });
}

/**
 * `POST /api/notifications/inbox` — marks one of the authenticated wallet's
 * notifications as read.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>`.
 * - **Request body (JSON):** `{ id: string }`.
 * - **Responses:**
 *   - `200` `{ ok: true }` — marked read.
 *   - `400` `{ error }` — missing or invalid `id`.
 *   - `401` `{ error: "unauthorized" }` — missing or invalid session.
 *   - `404` `{ error: "not found" }` — no such notification for this wallet.
 *
 * @param request - Incoming request carrying the bearer token and JSON body.
 * @returns JSON response per the contract above.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = verifyAccountSession(bearer(request));
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	let body: { id?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
	}
	if (typeof body.id !== "string" || body.id === "")
		return NextResponse.json({ error: "id required" }, { status: 400 });

	if (!isDatabaseConfigured()) return NextResponse.json({ error: "not found" }, { status: 404 });

	const owned = await notifications.markRead(body.id, session.walletAddress);
	if (!owned) return NextResponse.json({ error: "not found" }, { status: 404 });
	return NextResponse.json({ ok: true });
}
