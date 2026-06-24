import { NextResponse } from "next/server";
import { getOracleStatus } from "@/services/oracle";

export const dynamic = "force-dynamic";

/**
 * `GET /api/oracle/status` — public metadata for the display-rate oracle.
 *
 * - **Auth:** none.
 * - **Request:** no parameters.
 * - **Behavior:** exposes provider shape, supported pairs, TTL, and cache state
 *   only; never returns credentials and performs no provider fetch.
 * - **Responses:** `200` `{ ok: true, oracle }`.
 *
 * @returns JSON oracle status metadata.
 */
export function GET(): NextResponse {
	return NextResponse.json({ ok: true, oracle: getOracleStatus() });
}
