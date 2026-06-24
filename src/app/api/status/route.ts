import { NextResponse } from "next/server";
import { buildHealthReport } from "@/services/health";
import { getContractSummaryMetrics } from "@/services/contractSummary";
import { summarizeAnalyticsEvents } from "@/services/trafficAnalytics";

/**
 * `GET /api/status` — public operations summary.
 *
 * - **Auth:** none (public, privacy-safe aggregates only).
 * - **Request:** no parameters.
 * - **Responses:** `200` `{ health, contractSummary, privacyAnalytics }` —
 *   configuration-presence health, on-chain contract metrics, and aggregated
 *   privacy analytics. Never includes secrets or raw events.
 *
 * @returns JSON status payload.
 */
export function GET(): NextResponse {
	return NextResponse.json({
		health: buildHealthReport(),
		contractSummary: getContractSummaryMetrics(),
		privacyAnalytics: summarizeAnalyticsEvents(),
	});
}
