import { type NextRequest, NextResponse } from "next/server";
import { fetchOracleRate, isOracleAsset, isOracleQuote } from "@/services/oracle";

export const dynamic = "force-dynamic";

/**
 * `GET /api/oracle/rates?base=eth&quote=usd` — server-side exchange-rate lookup
 * for stablecoin/payment UX.
 *
 * - **Auth:** none.
 * - **Query:** `base` (oracle asset, default `eth`), `quote` (oracle quote,
 *   default `usd`); both validated against an allowlist.
 * - **Behavior:** fetches from a configurable provider, caches briefly
 *   server-side, and marks fallback values as stale.
 * - **Responses:**
 *   - `200` `{ ok: true, rate }`.
 *   - `400` `{ error }` for an unsupported base or quote asset.
 *   - `502` `{ error }` when the provider fetch fails.
 *
 * @param req - Incoming request carrying the `base`/`quote` query params.
 * @returns JSON rate payload or an error.
 */
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
