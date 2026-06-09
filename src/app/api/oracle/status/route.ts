import { NextResponse } from "next/server";
import { getOracleStatus } from "@/services/oracle";

// GET /api/oracle/status
//
// Public metadata for the display-rate oracle. This exposes provider shape,
// supported pairs, TTL, and cache state only. It never returns credentials and
// does not perform a provider fetch.

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
	return NextResponse.json({ ok: true, oracle: getOracleStatus() });
}
