import { type NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { sendEmail } from "@/services/email";
import {
	buildNotification,
	type DeadlineReminder,
	type DeadlineScanContract,
	findDeadlineReminders,
} from "@/services/notifications";
import { isAuthorizedBearer } from "@/services/bearerAuth";
import { isDatabaseConfigured, notifications, userProfiles } from "@/lib/db";

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
// Recipient resolution prefers the Phase 6 off-chain account database
// (userProfiles.emailForWallet) and falls back to the NOTIFICATION_EMAILS env
// map (JSON) when the DB is unconfigured or has no email on file. Addresses with
// no known email anywhere are counted as "skipped" rather than emailed. When the
// DB is configured, each reminder is also recorded as an in-app Notification.

export const dynamic = "force-dynamic"; // never cache; always read fresh on-chain state

/** Reminder look-ahead/look-back window in seconds (48h). */
const WINDOW_SECONDS = 48 * 60 * 60;

/** Cap how many contracts we read per run to bound RPC usage on large histories. */
const MAX_CONTRACTS = 500;

/** Parse the NOTIFICATION_EMAILS env JSON into a lowercase address→email map. */
function loadEmailMap(): Record<string, string> {
	const raw = process.env.NOTIFICATION_EMAILS;
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

/**
 * `GET /api/cron/deadline-reminders` — scheduled scanner that emails contract
 * parties when a project, acceptance, or warranty deadline is within the
 * reminder window. Wired as a daily Vercel Cron in `vercel.json`.
 *
 * - **Auth:** required. `Authorization: Bearer <CRON_SECRET>` (Vercel attaches
 *   this to cron invocations). Anonymous calls are rejected.
 * - **Request:** no parameters.
 * - **Behavior:** recipient email is resolved from the off-chain account
 *   database first, then the `NOTIFICATION_EMAILS` env map; addresses with no
 *   email anywhere are counted as skipped. Each reminder is also recorded as an
 *   in-app notification when the database is configured.
 * - **Responses:**
 *   - `200` `{ ...counts }` summary of reminders sent/skipped.
 *   - `401` `{ error: "unauthorized" }`.
 *   - `500` `{ error }` when `CRON_SECRET` or `SEPOLIA_RPC_URL` is unset.
 *
 * @param req - Incoming request carrying the cron bearer token.
 * @returns JSON run summary or an error.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
	const cronSecret = process.env.CRON_SECRET;
	if (cronSecret === undefined || cronSecret === "")
		return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
	if (!isAuthorizedBearer(req.headers.get("authorization"), cronSecret))
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	const rpcUrl = process.env.SEPOLIA_RPC_URL;
	if (rpcUrl === undefined || rpcUrl === "")
		return NextResponse.json({ error: "SEPOLIA_RPC_URL not set" }, { status: 500 });
	if (TRUSTLEDGER_ADDRESS === "0x0000000000000000000000000000000000000000")
		return NextResponse.json({ error: "TrustLedger address not configured" }, { status: 500 });

	// `chain: sepolia` gives multicall the canonical Multicall3 address; the cron
	// reads from SEPOLIA_RPC_URL, matching the testnet deployment.
	const client = createPublicClient({
		chain: sepolia,
		transport: http(rpcUrl, { retryCount: 1, timeout: 10_000 }),
	});
	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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

	// Best-effort in-app notification feed: record one row per reminder when the
	// off-chain database is configured. Never fail the run on a write error.
	if (isDatabaseConfigured()) {
		await Promise.allSettled(
			reminders.map(
				async (r) =>
					await notifications.create({
						walletAddress: r.recipient,
						type: "deadline_reminder",
						title: `Deadline ${r.upcoming ? "approaching" : "overdue"} — contract #${r.contractId}`,
						body: `The ${r.kind} deadline for contract #${r.contractId} is ${
							r.upcoming ? "approaching" : "overdue"
						}. Take action before an automatic on-chain outcome applies.`,
						contractId: r.contractId,
					}),
			),
		);
	}

	// Resolve each recipient's email: prefer the off-chain profile on file, then
	// fall back to the NOTIFICATION_EMAILS env map. Partition into sendable and
	// skipped (no email known anywhere).
	const dbConfigured = isDatabaseConfigured();
	const resolved = await Promise.all(
		reminders.map(async (r) => {
			const dbEmail = dbConfigured ? await userProfiles.emailForWallet(r.recipient) : null;
			const to = dbEmail ?? emailMap[r.recipient.toLowerCase()];
			return to !== undefined ? { r, to } : null;
		}),
	);
	const toSend = resolved.filter(
		(entry): entry is { r: DeadlineReminder; to: string } => entry !== null,
	);
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
