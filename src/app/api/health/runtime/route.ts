import { NextResponse } from "next/server";
import { buildRuntimeHealthReport } from "@/services/health";

export const dynamic = "force-dynamic";

/**
 * `GET /api/health/runtime` — unauthenticated runtime liveness probe for
 * container orchestrators (Kubernetes, Docker).
 *
 * - **Auth:** none (safe runtime signals only). Full configuration checks live
 *   on `GET /api/health`.
 * - **Request:** no parameters.
 * - **Responses:** `200` runtime health report.
 *
 * @returns JSON runtime health report.
 */
export function GET(): NextResponse {
	const report = buildRuntimeHealthReport();
	return NextResponse.json(report, { status: 200 });
}
