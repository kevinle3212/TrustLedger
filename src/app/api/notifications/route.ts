import { type NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/services/email";
import {
	buildNotification,
	type DeadlineKind,
	type NotificationType,
} from "@/services/notifications";
import { isAuthorizedBearer } from "@/services/bearerAuth";

// POST /api/notifications
// Sends a single contract-lifecycle email (new offer, work submitted, approval,
// dispute, rating, deadline reminder) to one recipient.
//
// Authentication: requires `Authorization: Bearer <NOTIFICATIONS_SECRET>`. This
// endpoint can send arbitrary email, so it is gated to trusted server-side
// callers (other API routes, the deadline cron, or a future backend) and must
// never be invoked directly from the browser.
//
// Body (JSON):
//   {
//     "type": "work_submitted",          // one of NotificationType
//     "to": "freelancer@example.com",     // recipient email
//     "contractId": "12",                 // on-chain contract id
//     "deadlineKind": "project",          // deadline_reminder only
//     "deadlineTs": 1733356800,           // deadline_reminder only (unix seconds)
//     "detail": "Score: 92/100"           // optional extra copy
//   }

const VALID_TYPES: readonly NotificationType[] = [
	"contract_offer",
	"work_submitted",
	"work_approved",
	"dispute_opened",
	"dispute_resolved",
	"rating_received",
	"deadline_reminder",
];

const VALID_DEADLINE_KINDS: readonly DeadlineKind[] = ["project", "acceptance", "warranty"];

/** Constant-time bearer check against NOTIFICATIONS_SECRET. */
function isAuthorized(req: NextRequest): boolean {
	return isAuthorizedBearer(req.headers.get("authorization"), process.env.NOTIFICATIONS_SECRET);
}

/**
 * `POST /api/notifications` — sends a single contract-lifecycle email to one
 * recipient.
 *
 * - **Auth:** required. `Authorization: Bearer <NOTIFICATIONS_SECRET>`. Because
 *   it can send arbitrary email, it is gated to trusted server-side callers
 *   (other API routes, the deadline cron, a future backend) and must never be
 *   invoked from the browser.
 * - **Request body (JSON):** `type` ({@link NotificationType}, required), `to`
 *   (recipient email, required), `contractId` (string, required),
 *   `deadlineKind` ({@link DeadlineKind}, `deadline_reminder` only),
 *   `deadlineTs` (unix seconds, `deadline_reminder` only), `detail` (optional).
 * - **Responses:**
 *   - `200` `{ ok: true }` when sent.
 *   - `400` `{ error }` for invalid JSON or fields.
 *   - `401` `{ error: "unauthorized" }`.
 *   - `500` when `NOTIFICATIONS_SECRET` is unset.
 *   - `502` `{ error }` when the email provider fails.
 *
 * @param req - Incoming request carrying the bearer token and JSON body.
 * @returns JSON acknowledgement or an error.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
	if (process.env.NOTIFICATIONS_SECRET === undefined || process.env.NOTIFICATIONS_SECRET === "")
		return NextResponse.json({ error: "NOTIFICATIONS_SECRET not set" }, { status: 500 });
	if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

	let body: {
		type?: unknown;
		to?: unknown;
		contractId?: unknown;
		deadlineKind?: unknown;
		deadlineTs?: unknown;
		detail?: unknown;
	};
	try {
		body = (await req.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
	}

	const { type, to, contractId, deadlineKind, deadlineTs, detail } = body;

	if (typeof type !== "string" || !VALID_TYPES.includes(type as NotificationType))
		return NextResponse.json({ error: "valid type required" }, { status: 400 });
	if (typeof to !== "string" || !to.includes("@"))
		return NextResponse.json({ error: "valid recipient email (to) required" }, { status: 400 });
	if (typeof contractId !== "string" || contractId === "")
		return NextResponse.json({ error: "contractId required" }, { status: 400 });
	if (
		deadlineKind !== undefined &&
		(typeof deadlineKind !== "string" ||
			!VALID_DEADLINE_KINDS.includes(deadlineKind as DeadlineKind))
	)
		return NextResponse.json({ error: "invalid deadlineKind" }, { status: 400 });
	if (deadlineTs !== undefined && typeof deadlineTs !== "number")
		return NextResponse.json({ error: "deadlineTs must be a number" }, { status: 400 });
	if (detail !== undefined && typeof detail !== "string")
		return NextResponse.json({ error: "detail must be a string" }, { status: 400 });

	const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const { subject, html } = buildNotification(type as NotificationType, {
		contractId,
		appUrl,
		...(deadlineKind !== undefined ? { deadlineKind: deadlineKind as DeadlineKind } : {}),
		...(deadlineTs !== undefined ? { deadlineTs } : {}),
		...(detail !== undefined ? { detail } : {}),
	});

	const result = await sendEmail({ to, subject, html });
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

	return NextResponse.json({ ok: true });
}
