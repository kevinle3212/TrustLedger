import { NextResponse } from "next/server";
import { buildHealthReport, buildRuntimeHealthReport } from "@/services/health";
import { isAuthorizedHealthRequest } from "@/services/healthAuth";

// GET /api/health
//
// Admin-only operational readiness endpoint. It reports configuration presence
// only and never returns secret values. Runtime probes should use
// /api/health/runtime instead.

export const dynamic = "force-dynamic";

export function GET(request: Request): NextResponse {
	const scope = new URL(request.url).searchParams.get("scope");
	if (scope !== "runtime" && !isAuthorizedHealthRequest(request)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const report = scope === "runtime" ? buildRuntimeHealthReport() : buildHealthReport();
	return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
