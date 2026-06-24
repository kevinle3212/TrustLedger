import { NextResponse } from "next/server";
import { getGitHubAnalytics } from "@/services/githubAnalytics";

export const dynamic = "force-dynamic";

/**
 * `GET /api/analytics/github` — public GitHub repository activity for the
 * status page.
 *
 * - **Auth:** none.
 * - **Request:** no parameters.
 * - **Responses:**
 *   - `200` analytics payload when a public repository is configured.
 *   - `204` (no content) when GitHub analytics are unavailable/unconfigured.
 *
 * @returns JSON analytics payload, or a `204` response.
 */
export async function GET(): Promise<NextResponse> {
	const analytics = await getGitHubAnalytics();
	if (!analytics.available) return new NextResponse(null, { status: 204 });
	return NextResponse.json(analytics);
}
