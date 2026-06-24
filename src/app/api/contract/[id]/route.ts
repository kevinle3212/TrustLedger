import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { resolveDocUrl } from "@/lib/utils";

// GET /api/contract/[id]
//
// Server-side aggregation of a single escrow contract: reads the on-chain
// `getContract(id)` struct and returns a JSON-safe, frontend-friendly shape
// (bigints serialised to strings, status label resolved, document/deliverable
// URIs resolved to gateway URLs). This is the example backend route called for
// in the Phase 2 "middleware.ts and API routes" item — it shows on-chain reads
// moving off the client so heavier aggregation can grow here without bloating
// the browser bundle.
//
// Public, read-only: contract data is already public on-chain. No secrets are
// touched, so no auth is required. Sensitive document decryption stays
// client-side (see DecryptDocumentForm) and is never performed here.

export const dynamic = "force-dynamic";

/**
 * `GET /api/contract/:id` — server-side aggregation of a single escrow contract.
 *
 * Reads the on-chain `getContract(id)` struct and returns a JSON-safe shape
 * (bigints serialized to strings, status label resolved, document/deliverable
 * URIs resolved to gateway URLs). Moves on-chain reads off the client.
 *
 * - **Auth:** none (contract data is already public on-chain; no secrets, no
 *   document decryption here).
 * - **Path params:** `id` — non-negative integer contract id.
 * - **Responses:**
 *   - `200` JSON-safe contract object.
 *   - `400` `{ error }` when `id` is not a non-negative integer.
 *   - `500` `{ error }` when `SEPOLIA_RPC_URL` or the contract address is
 *     unconfigured.
 *
 * @param _req - Incoming request (unused).
 * @param context - Route context whose `params` resolves to `{ id }`.
 * @returns JSON contract payload or an error.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	const { id } = await params;

	if (!/^\d+$/.test(id))
		return NextResponse.json({ error: "id must be a non-negative integer" }, { status: 400 });

	const rpcUrl = process.env["SEPOLIA_RPC_URL"];
	if (rpcUrl === undefined || rpcUrl === "")
		return NextResponse.json({ error: "SEPOLIA_RPC_URL not set" }, { status: 500 });
	if (TRUSTLEDGER_ADDRESS === "0x0000000000000000000000000000000000000000")
		return NextResponse.json({ error: "TrustLedger address not configured" }, { status: 500 });

	const client = createPublicClient({
		chain: sepolia,
		transport: http(rpcUrl, { retryCount: 1, timeout: 10_000 }),
	});

	let c: {
		client: string;
		freelancer: string;
		status: number;
		amount: bigint;
		holdBackBps: number;
		projectDeadline: bigint;
		acceptanceDeadline: bigint;
		warrantyDeadline: bigint;
		contractURI: string;
		proofOfWorkURI: string;
		arbitrationId: bigint;
	};
	try {
		c = await client.readContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "getContract",
			args: [BigInt(id)],
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "failed to read contract" },
			{ status: 502 },
		);
	}

	// Normalise into a JSON-safe payload: bigints → decimal strings, status label
	// resolved, and URIs resolved to openable gateway URLs (null when none).
	return NextResponse.json({
		id,
		client: c.client,
		freelancer: c.freelancer,
		status: c.status,
		statusLabel: STATUS_LABELS[c.status] ?? "Unknown",
		amountWei: c.amount.toString(),
		holdBackBps: c.holdBackBps,
		projectDeadline: c.projectDeadline.toString(),
		acceptanceDeadline: c.acceptanceDeadline.toString(),
		warrantyDeadline: c.warrantyDeadline.toString(),
		documentUrl: resolveDocUrl(c.contractURI) ?? null,
		deliverableUrl: resolveDocUrl(c.proofOfWorkURI) ?? null,
		arbitrationId: c.arbitrationId.toString(),
	});
}
