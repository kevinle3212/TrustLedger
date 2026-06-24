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

/**
 * `POST /api/analytics/events` — records a single privacy-safe analytics event.
 *
 * - **Auth:** none, but honors Do-Not-Track / privacy headers.
 * - **Request body (JSON):** `{ name: "page_view" | "frontend_error", path:
 *   string, locale?: string }`.
 * - **Responses:**
 *   - `200` `{ ok: true }` when recorded.
 *   - `204` when privacy headers opt out, or the event is dropped by sampling.
 *   - `400` `{ error }` for invalid JSON or an invalid event shape.
 *
 * @param request - Incoming request carrying the JSON event.
 * @returns JSON acknowledgement, a `204`, or an error.
 */
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

/**
 * `GET /api/analytics/events` — returns aggregated analytics (admin/health
 * authorized).
 *
 * - **Auth:** required. {@link isAuthorizedHealthRequest} (bearer/loopback/IP
 *   allowlist).
 * - **Request:** no parameters.
 * - **Responses:**
 *   - `200` aggregated analytics summary.
 *   - `401` `{ error: "Unauthorized" }`.
 *
 * @param request - Incoming request (provides auth headers).
 * @returns JSON analytics summary or an error.
 */
export function GET(request: Request): NextResponse {
	if (!isAuthorizedHealthRequest(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	return NextResponse.json(summarizeAnalyticsEvents());
}
