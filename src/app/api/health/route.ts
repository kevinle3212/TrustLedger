import { NextResponse } from "next/server";
import { buildHealthReport } from "@/services/health";

// GET /api/health
//
// Operational readiness endpoint for uptime checks and deployment smoke tests.
// It reports configuration presence only and never returns secret values.

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
	const report = buildHealthReport();
	return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
