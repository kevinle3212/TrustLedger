import "server-only";

import type { NextRequest } from "next/server";

import { verifyAccountSession, type AccountSession } from "@/services/offchainAccounts";

/**
 * Shared bearer-session helper for authenticated API routes. Reads the
 * `Authorization: Bearer <token>` header and verifies it. Server-only.
 *
 * @param request - Incoming request.
 * @returns The decoded {@link AccountSession}, or `null` when the header is
 *   absent, malformed, or the session is invalid or expired.
 */
export function sessionFromRequest(request: NextRequest): AccountSession | null {
	const header = request.headers.get("authorization");
	if (header?.startsWith("Bearer ") !== true) return null;
	return verifyAccountSession(header.slice("Bearer ".length));
}
