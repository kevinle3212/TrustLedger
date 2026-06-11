import { NextResponse } from "next/server";
import { getGitHubAnalytics } from "@/services/githubAnalytics";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
	const analytics = await getGitHubAnalytics();
	if (!analytics.available) return new NextResponse(null, { status: 204 });
	return NextResponse.json(analytics);
}
