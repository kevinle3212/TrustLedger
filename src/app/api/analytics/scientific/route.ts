import { buildScientificAnalyticsManifest } from "@/lib/scientificAnalytics";
import { NextResponse } from "next/server";

export function GET(): NextResponse {
	const manifest = buildScientificAnalyticsManifest();
	return NextResponse.json(manifest);
}
