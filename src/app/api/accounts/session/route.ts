import { NextResponse, type NextRequest } from "next/server";
import { createAccountSession } from "@/services/offchainAccounts";

export async function POST(request: NextRequest): Promise<NextResponse> {
	const body = (await request.json()) as { walletAddress?: unknown; signature?: unknown };
	if (typeof body.walletAddress !== "string" || typeof body.signature !== "string")
		return NextResponse.json(
			{ error: "walletAddress and signature are required" },
			{ status: 400 },
		);
	try {
		const token = await createAccountSession({
			walletAddress: body.walletAddress,
			signature: body.signature as `0x${string}`,
		});
		return NextResponse.json({ token, expiresInSeconds: 1800 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "session creation failed" },
			{ status: 401 },
		);
	}
}
