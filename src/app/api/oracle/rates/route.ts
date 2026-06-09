import { type NextRequest, NextResponse } from "next/server";
import { fetchOracleRate, isOracleAsset, isOracleQuote } from "@/services/oracle";

// GET /api/oracle/rates?base=eth&quote=usd
//
// Server-side oracle endpoint for exchange-rate data used by stablecoin/payment
// UX. The route validates the symbol allowlist, fetches from a configurable
// provider, caches briefly server-side, and marks fallback values as stale.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
	const base = req.nextUrl.searchParams.get("base") ?? "eth";
	const quote = req.nextUrl.searchParams.get("quote") ?? "usd";

	if (!isOracleAsset(base)) {
		return NextResponse.json({ error: "unsupported base asset" }, { status: 400 });
	}
	if (!isOracleQuote(quote)) {
		return NextResponse.json({ error: "unsupported quote asset" }, { status: 400 });
	}

	try {
		const rate = await fetchOracleRate(base, quote);
		return NextResponse.json({ ok: true, rate });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "oracle fetch failed" },
			{ status: 502 },
		);
	}
}
