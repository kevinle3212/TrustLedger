import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatEther, http, keccak256, toBytes } from "viem";
import { sepolia } from "viem/chains";
import { STATUS_LABELS, TRUSTLEDGER_ABI } from "@/lib/abi";
import { getUsdcAddress, TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { summarizeContract } from "@/services/contractSummary";

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

	const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
	const contract = await client.readContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "getContract",
		args: [BigInt(id)],
	});
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
