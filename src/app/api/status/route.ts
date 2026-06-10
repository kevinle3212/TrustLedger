import { NextResponse } from "next/server";
import { buildHealthReport } from "@/services/health";
import { getContractSummaryMetrics } from "@/services/contractSummary";
import { summarizeAnalyticsEvents } from "@/services/trafficAnalytics";

export function GET(): NextResponse {
	return NextResponse.json({
		health: buildHealthReport(),
		contractSummary: getContractSummaryMetrics(),
		privacyAnalytics: summarizeAnalyticsEvents(),
	});
}
