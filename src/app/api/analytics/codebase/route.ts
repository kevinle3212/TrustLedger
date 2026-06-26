import { getCodebaseStats } from "@/lib/codebaseStats";
import { NextResponse } from "next/server";

/**
 * `GET /api/analytics/codebase` — public snapshot of the codebase scale
 * (lines of code, file and directory counts, and a per-category file-type
 * breakdown that only includes categories present in the repository).
 *
 * - **Auth:** none.
 * - **Request:** no parameters.
 * - **Responses:** `200` codebase statistics object.
 *
 * The payload is generated at build time from git-tracked files, so it contains
 * no private information and is computed without any request-time filesystem
 * access.
 *
 * @returns JSON codebase statistics snapshot.
 */
export function GET(): NextResponse {
	return NextResponse.json(getCodebaseStats());
}
