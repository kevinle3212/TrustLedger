import { NextResponse, type NextRequest } from "next/server";
import { createAccountChallenge } from "@/services/offchainAccounts";

export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as { address?: unknown };
	if (typeof body.address !== "string")
		return NextResponse.json({ error: "address is required" }, { status: 400 });
	try {
		return NextResponse.json(createAccountChallenge(body.address));
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "invalid challenge request" },
			{ status: 400 },
		);
	}
}
