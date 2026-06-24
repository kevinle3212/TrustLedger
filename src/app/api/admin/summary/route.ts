import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "@/services/adminAuth";
import { buildAdminDashboardReport } from "@/services/adminReport";

export const dynamic = "force-dynamic";

/**
 * `GET /api/admin/summary` — admin dashboard report (operational metrics).
 *
 * - **Auth:** required. {@link isAuthorizedAdminRequest} (IP allowlist + valid
 *   admin session or bearer token).
 * - **Request:** no parameters.
 * - **Responses:**
 *   - `200` admin dashboard report.
 *   - `401` `{ error: "unauthorized" }`.
 *
 * @param request - Incoming request (provides auth headers).
 * @returns JSON admin report or an error.
 */
export function GET(request: Request): NextResponse {
	if (!isAuthorizedAdminRequest(request.headers)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	return NextResponse.json(buildAdminDashboardReport());
}
