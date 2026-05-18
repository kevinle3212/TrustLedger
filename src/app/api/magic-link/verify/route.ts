import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, type MagicLinkPayload } from "@/lib/magicLink";

export async function GET(req: NextRequest): Promise<NextResponse> {
	const secret = process.env["MAGIC_LINK_SECRET"];
	if (!secret) return NextResponse.json({ error: "MAGIC_LINK_SECRET not set" }, { status: 500 });

	const token = req.nextUrl.searchParams.get("token");
	if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

	let payload: MagicLinkPayload;
	try {
		payload = await verifyMagicToken(token, secret);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "invalid token" },
			{ status: 401 },
		);
	}

	return NextResponse.json({ ok: true, payload });
}
