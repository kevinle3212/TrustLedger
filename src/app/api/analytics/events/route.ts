import { logger, normalizeError } from "@/core";
import { isAuthorizedHealthRequest } from "@/services/healthAuth";
import {
	recordAnalyticsEvent,
	shouldRespectPrivacyHeaders,
	summarizeAnalyticsEvents,
	type AnalyticsEventInput,
} from "@/services/trafficAnalytics";
import { NextResponse } from "next/server";

function isAnalyticsEventInput(value: unknown): value is AnalyticsEventInput {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		(record["name"] === "page_view" || record["name"] === "frontend_error") &&
		typeof record["path"] === "string" &&
		(record["locale"] === undefined || typeof record["locale"] === "string")
	);
}

export async function POST(request: Request): Promise<NextResponse> {
	if (shouldRespectPrivacyHeaders(request.headers)) {
		return new NextResponse(null, { status: 204 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch (error: unknown) {
		logger.warn("analytics:invalid-json", { message: normalizeError(error).message });
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	if (!isAnalyticsEventInput(body)) {
		return NextResponse.json({ error: "Invalid Analytics Event" }, { status: 400 });
	}

	const record = recordAnalyticsEvent(body);
	return record === null
		? new NextResponse(null, { status: 204 })
		: NextResponse.json({ ok: true });
}

export function GET(request: Request): NextResponse {
	if (!isAuthorizedHealthRequest(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	return NextResponse.json(summarizeAnalyticsEvents());
}
