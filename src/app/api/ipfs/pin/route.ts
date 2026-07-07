import { type NextRequest, NextResponse } from "next/server";
import { uploadToPinata } from "@/lib/ipfs";
import { sessionFromRequest } from "@/services/accountRequest";

export const dynamic = "force-dynamic";

const MAX_PINATA_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * `POST /api/ipfs/pin` - pins a contract document to IPFS using server secrets.
 *
 * - **Auth:** required. `Authorization: Bearer <session-token>` protects the
 *   server-side Pinata quota from anonymous abuse.
 * - **Body:** multipart form data with `file`.
 * - **Responses:**
 *   - `200` `{ uri }` for the pinned `ipfs://` URI.
 *   - `400` `{ error }` when the file is missing.
 *   - `413` `{ error }` when the file exceeds the upload limit.
 *   - `500` `{ error }` when Pinata is not configured or rejects the upload.
 *
 * @param request - Incoming multipart upload request.
 * @returns JSON pin result or a safe error message.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const session = sessionFromRequest(request);
	if (session === null) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	const formData = await request.formData();
	const file = formData.get("file");

	if (!(file instanceof File)) {
		return NextResponse.json({ error: "file is required" }, { status: 400 });
	}

	if (file.size > MAX_PINATA_UPLOAD_BYTES) {
		return NextResponse.json({ error: "file exceeds the 25 MB upload limit" }, { status: 413 });
	}

	try {
		const uri = await uploadToPinata(file, file.name);
		return NextResponse.json({ uri });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "IPFS upload failed" },
			{ status: 500 },
		);
	}
}
