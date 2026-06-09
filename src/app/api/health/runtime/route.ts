import { NextResponse } from "next/server";
import { buildRuntimeHealthReport } from "@/services/health";

// Runtime-only health endpoint for container probes. Full operational
// configuration checks stay on /api/health.

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
	const report = buildRuntimeHealthReport();
	return NextResponse.json(report, { status: 200 });
}
