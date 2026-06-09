import { NextResponse } from "next/server";
import { buildHealthReport, buildRuntimeHealthReport } from "@/services/health";

// GET /api/health
//
// Operational readiness endpoint for uptime checks and deployment smoke tests.
// It reports configuration presence only and never returns secret values.

export const dynamic = "force-dynamic";

export function GET(request: Request): NextResponse {
	const scope = new URL(request.url).searchParams.get("scope");
	const report = scope === "runtime" ? buildRuntimeHealthReport() : buildHealthReport();
	return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
