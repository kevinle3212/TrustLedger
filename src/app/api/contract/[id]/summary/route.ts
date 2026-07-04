import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatEther, http, keccak256, toBytes } from "viem";
import { sepolia } from "viem/chains";
import { STATUS_LABELS, TRUSTLEDGER_ABI } from "@/lib/abi";
import { getUsdcAddress, TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { summarizeContract } from "@/services/contractSummary";
import type { Contract } from "@/types";

export const dynamic = "force-dynamic";

function deadlineIso(value: bigint): string | null {
	if (value === 0n) return null;
	return new Date(Number(value) * 1000).toISOString();
}

function tokenSymbol(token: string): "ETH" | "USDC" | "Unknown" {
	if (token === "0x0000000000000000000000000000000000000000") return "ETH";
	if (token.toLowerCase() === getUsdcAddress(sepolia.id)?.toLowerCase()) return "USDC";
	return "Unknown";
}

function isAddress(value: unknown): value is `0x${string}` {
	return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isContract(value: unknown): value is Contract {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		isAddress(record["client"]) &&
		isAddress(record["freelancer"]) &&
		isAddress(record["token"]) &&
		typeof record["status"] === "number" &&
		typeof record["amount"] === "bigint" &&
		typeof record["projectDeadline"] === "bigint" &&
		typeof record["acceptanceDeadline"] === "bigint" &&
		typeof record["warrantyDeadline"] === "bigint" &&
		typeof record["holdBackBps"] === "number" &&
		typeof record["proposedByClient"] === "boolean"
	);
}

/**
 * `GET /api/contract/:id/summary` — human-readable summary of a single escrow
 * contract, derived from on-chain state.
 *
 * - **Auth:** none (contract data is public on-chain).
 * - **Path params:** `id` — non-negative integer contract id.
 * - **Responses:**
 *   - `200` contract summary payload.
 *   - `400` `{ error }` when `id` is not a non-negative integer.
 *   - `500` `{ error }` when `SEPOLIA_RPC_URL` or the contract address is
 *     unconfigured.
 *
 * @param _req - Incoming request (unused).
 * @param context - Route context whose `params` resolves to `{ id }`.
 * @returns JSON summary payload or an error.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	const { id } = await params;
	if (!/^\d+$/.test(id))
		return NextResponse.json({ error: "id must be a non-negative integer" }, { status: 400 });

	const rpcUrl = process.env.SEPOLIA_RPC_URL;
	if (rpcUrl === undefined || rpcUrl === "")
		return NextResponse.json({ error: "SEPOLIA_RPC_URL not set" }, { status: 500 });
	if (TRUSTLEDGER_ADDRESS === "0x0000000000000000000000000000000000000000")
		return NextResponse.json({ error: "TrustLedger address not configured" }, { status: 500 });

	const client = createPublicClient({
		chain: sepolia,
		transport: http(rpcUrl, { retryCount: 1, timeout: 10_000 }),
	});
	let contract: Contract;
	try {
		const result = await client.readContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "getContract",
			args: [BigInt(id)],
		});
		if (!isContract(result)) throw new Error("contract response had an unexpected shape");
		contract = result;
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "failed to read contract" },
			{ status: 502 },
		);
	}
	const symbol = tokenSymbol(contract.token);
	const contractHash = keccak256(
		toBytes(
			[
				id,
				contract.status.toString(),
				contract.amount.toString(),
				contract.projectDeadline.toString(),
				contract.acceptanceDeadline.toString(),
				contract.warrantyDeadline.toString(),
				contract.holdBackBps.toString(),
			].join(":"),
		),
	);
	const summary = await summarizeContract({
		contractId: id,
		contractHash,
		statusLabel: STATUS_LABELS[contract.status] ?? "Unknown",
		client: contract.client,
		freelancer: contract.freelancer,
		amount:
			symbol === "ETH" ? `${formatEther(contract.amount)} ETH` : contract.amount.toString(),
		tokenSymbol: symbol,
		projectDeadlineIso: deadlineIso(contract.projectDeadline),
		acceptanceDeadlineIso: deadlineIso(contract.acceptanceDeadline),
		warrantyDeadlineIso: deadlineIso(contract.warrantyDeadline),
		holdBackBps: contract.holdBackBps,
		proposedByClient: contract.proposedByClient,
		sourceMetadataVersion: "trustledger-contract-v1",
	});
	return NextResponse.json(summary);
}
