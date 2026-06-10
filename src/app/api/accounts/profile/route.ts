import { NextResponse, type NextRequest } from "next/server";
import {
	getAccountProfile,
	updateAccountProfile,
	verifyAccountSession,
} from "@/services/offchainAccounts";

function bearer(request: NextRequest): string | null {
	const header = request.headers.get("authorization");
	if (header?.startsWith("Bearer ") !== true) return null;
	return header.slice("Bearer ".length);
}

export function GET(request: NextRequest): NextResponse {
	const session = verifyAccountSession(bearer(request));
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const profile = getAccountProfile(session.walletAddress);
	return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
	const session = verifyAccountSession(bearer(request));
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	const body = (await request.json()) as Record<string, unknown>;
	const profile = updateAccountProfile(session.walletAddress, {
		...(typeof body["displayName"] === "string" ? { displayName: body["displayName"] } : {}),
		...(typeof body["avatarUrl"] === "string" ? { avatarUrl: body["avatarUrl"] } : {}),
		...(typeof body["email"] === "string" ? { email: body["email"] } : {}),
		...(typeof body["onboardingComplete"] === "boolean"
			? { onboardingComplete: body["onboardingComplete"] }
			: {}),
		...(typeof body["notificationsEnabled"] === "boolean"
			? { notificationsEnabled: body["notificationsEnabled"] }
			: {}),
	});
	return NextResponse.json({ profile });
}
