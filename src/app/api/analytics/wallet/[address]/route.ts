import { buildWalletAnalyticsMetadata } from "@/lib/analyticsApi";
import { NextResponse } from "next/server";

export function GET(
	_request: Request,
	{ params }: { readonly params: { readonly address: string } },
): NextResponse {
	const metadata = buildWalletAnalyticsMetadata(params.address);
	if (metadata === null) {
		return NextResponse.json({ error: "Invalid Wallet Address" }, { status: 400 });
	}
	return NextResponse.json(metadata);
}
