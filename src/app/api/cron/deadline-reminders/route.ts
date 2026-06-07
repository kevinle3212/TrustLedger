import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { sendEmail } from "@/services/email";
import {
	buildNotification,
	type DeadlineScanContract,
	findDeadlineReminders,
} from "@/services/notifications";

// GET /api/cron/deadline-reminders
//
// Scheduled scanner that emails contract parties when a project, acceptance, or
// warranty deadline is within the reminder window (see findDeadlineReminders).
// Wired as a Vercel Cron in `vercel.json` (daily); it can also be invoked
// manually for testing.
//
// Authentication: Vercel automatically attaches `Authorization: Bearer
// <CRON_SECRET>` to cron invocations when CRON_SECRET is configured. We reject
// anything without that header so the endpoint cannot be triggered anonymously.
//
// Recipient resolution is a deliberate stopgap until the Phase 6 off-chain
// account database lands: we read an address→email map from the
// NOTIFICATION_EMAILS env var (JSON). Addresses with no known email are counted
// as "skipped" rather than emailed. Swap resolveEmail() for a DB lookup later.

export const dynamic = "force-dynamic"; // never cache; always read fresh on-chain state

/** Reminder look-ahead/look-back window in seconds (48h). */
const WINDOW_SECONDS = 48 * 60 * 60;

/** Cap how many contracts we read per run to bound RPC usage on large histories. */
const MAX_CONTRACTS = 500;

/** Parse the NOTIFICATION_EMAILS env JSON into a lowercase address→email map. */
function loadEmailMap(): Record<string, string> {
	const raw = process.env["NOTIFICATION_EMAILS"];
	if (raw === undefined || raw === "") return {};
	try {
		const parsed = JSON.parse(raw) as Record<string, string>;
		return Object.fromEntries(
			Object.entries(parsed).map(([addr, email]) => [addr.toLowerCase(), email]),
		);
	} catch {
		return {};
	}
}

export async function GET(req: NextRequest): Promise<NextResponse> {
	const cronSecret = process.env["CRON_SECRET"];
	if (cronSecret === undefined || cronSecret === "")
		return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
	if (req.headers.get("authorization") !== `Bearer ${cronSecret}`)
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	const rpcUrl = process.env["SEPOLIA_RPC_URL"];
	if (rpcUrl === undefined || rpcUrl === "")
		return NextResponse.json({ error: "SEPOLIA_RPC_URL not set" }, { status: 500 });
	if (TRUSTLEDGER_ADDRESS === "0x0000000000000000000000000000000000000000")
		return NextResponse.json({ error: "TrustLedger address not configured" }, { status: 500 });

	// `chain: sepolia` gives multicall the canonical Multicall3 address; the cron
	// reads from SEPOLIA_RPC_URL, matching the testnet deployment.
	const client = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
	const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
	const emailMap = loadEmailMap();

	// Total contract count, then read each open contract via multicall.
	let total: number;
	try {
		const nextId = await client.readContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "nextId",
		});
		total = Math.min(Number(nextId), MAX_CONTRACTS);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "failed to read nextId" },
			{ status: 502 },
		);
	}

	if (total === 0) return NextResponse.json({ ok: true, scanned: 0, sent: 0, skipped: 0 });

	const calls = Array.from({ length: total }, (_value, i) => ({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "getContract" as const,
		args: [BigInt(i)] as const,
	}));

	const results = await client.multicall({ contracts: calls, allowFailure: true });

	const contracts: DeadlineScanContract[] = [];
	results.forEach((res, i) => {
		if (res.status !== "success") return;
		const c = res.result as {
			status: number;
			client: string;
			freelancer: string;
			projectDeadline: bigint;
			acceptanceDeadline: bigint;
			warrantyDeadline: bigint;
		};
		contracts.push({
			id: String(i),
			status: c.status,
			client: c.client,
			freelancer: c.freelancer,
			projectDeadline: Number(c.projectDeadline),
			acceptanceDeadline: Number(c.acceptanceDeadline),
			warrantyDeadline: Number(c.warrantyDeadline),
		});
	});

	const now = Math.floor(Date.now() / 1000);
	const reminders = findDeadlineReminders(contracts, now, WINDOW_SECONDS);

	const errors: string[] = [];

	// Partition into skipped (no email on file) and sendable.
	const toSend = reminders.flatMap((r) => {
		const to = emailMap[r.recipient.toLowerCase()];
		return to !== undefined ? [{ r, to }] : [];
	});
	const skipped = reminders.length - toSend.length;

	// Send all emails concurrently to avoid serial await-in-loop.
	const sendResults = await Promise.allSettled(
		toSend.map(async ({ to, r }) => {
			const { subject, html } = buildNotification("deadline_reminder", {
				contractId: r.contractId,
				appUrl,
				deadlineKind: r.kind,
				deadlineTs: r.deadlineTs,
			});
			return await sendEmail({ to, subject, html });
		}),
	);

	let sent = 0;
	for (const [i, result] of sendResults.entries()) {
		const item = toSend[i];
		if (item === undefined) continue;
		const { contractId } = item.r;
		if (result.status === "rejected") {
			errors.push(`#${contractId}: ${String(result.reason)}`);
		} else if (result.value.ok) {
			sent++;
		} else {
			errors.push(`#${contractId}: ${result.value.error}`);
		}
	}

	return NextResponse.json({
		ok: true,
		scanned: contracts.length,
		matched: reminders.length,
		sent,
		skipped,
		...(errors.length > 0 ? { errors } : {}),
	});
}
