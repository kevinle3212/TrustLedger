import { buildWalletAnalyticsMetadata } from "@/lib/analyticsApi";
import { NextResponse } from "next/server";

/**
 * `GET /api/analytics/wallet/:address` — public, privacy-safe analytics metadata
 * for a wallet address.
 *
 * - **Auth:** none.
 * - **Path params:** `address` — wallet address (validated/normalized).
 * - **Responses:**
 *   - `200` wallet analytics metadata.
 *   - `400` `{ error: "Invalid Wallet Address" }`.
 *
 * @param _request - Incoming request (unused).
 * @param context - Route context containing the `address` path param.
 * @returns JSON wallet metadata or an error.
 */
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
