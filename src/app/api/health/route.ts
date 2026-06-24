import { NextResponse } from "next/server";
import { buildHealthReport, buildRuntimeHealthReport } from "@/services/health";
import { isAuthorizedHealthRequest } from "@/services/healthAuth";

export const dynamic = "force-dynamic";

/**
 * `GET /api/health` — operational readiness report.
 *
 * - **Auth:** required unless `?scope=runtime`. Authorized via
 *   {@link isAuthorizedHealthRequest} (bearer token, loopback, or allowlisted
 *   IP). Reports configuration *presence* only; never returns secret values.
 * - **Query:** `scope=runtime` returns the unauthenticated runtime probe report.
 * - **Responses:**
 *   - `200` health report when `ok`.
 *   - `503` health report when not `ok`.
 *   - `401` `{ error: "unauthorized" }` for non-runtime scope without auth.
 *
 * @param request - Incoming request (provides URL scope and auth headers).
 * @returns JSON health report.
 */
export function GET(request: Request): NextResponse {
	const scope = new URL(request.url).searchParams.get("scope");
	if (scope !== "runtime" && !isAuthorizedHealthRequest(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const report = scope === "runtime" ? buildRuntimeHealthReport() : buildHealthReport();
	return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
