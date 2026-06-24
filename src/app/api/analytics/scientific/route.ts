import { buildScientificAnalyticsManifest } from "@/lib/scientificAnalytics";
import { NextResponse } from "next/server";

/**
 * `GET /api/analytics/scientific` — public manifest describing the scientific
 * analytics artifacts (datasets, methodology, provenance).
 *
 * - **Auth:** none.
 * - **Request:** no parameters.
 * - **Responses:** `200` manifest object.
 *
 * @returns JSON scientific analytics manifest.
 */
export function GET(): NextResponse {
	const manifest = buildScientificAnalyticsManifest();
	return NextResponse.json(manifest);
}
