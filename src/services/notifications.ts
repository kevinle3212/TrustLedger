// Contract-lifecycle email notifications.
//
// This module turns an event (a new offer, submitted work, an approaching
// deadline, …) into a subject + HTML body via {@link emailShell}, and contains
// the pure deadline-scanning logic the cron route uses to decide who to remind.
//
// It is deliberately storage-agnostic: it never looks up an address→email
// mapping itself. Recipient resolution lives at the edges (the API/cron routes)
// so this file stays pure and unit-testable, and so it can be reused unchanged
// once the Phase 6 off-chain account database replaces the current env-based
// recipient map.

import { emailShell, escapeEmailHtml } from "./email";

/** Every kind of lifecycle email TrustLedger can send. */
export type NotificationType =
	| "contract_offer" // a client offered a new contract to a freelancer
	| "work_submitted" // the freelancer submitted proof-of-work for client review
	| "work_approved" // the client approved the deliverable
	| "dispute_opened" // a dispute was raised and sent to arbitration
	| "dispute_resolved" // arbitration executed a ruling
	| "rating_received" // a counterparty submitted a reputation rating
	| "deadline_reminder"; // a project/acceptance/warranty deadline is approaching or passed

/** Which deadline a {@link deadline_reminder} is about. */
export type DeadlineKind = "project" | "acceptance" | "warranty";

/** Data needed to render a notification. Fields are used per-type; extras are ignored. */
export interface NotificationData {
	contractId: string;
	/** Absolute base URL used to build the dashboard CTA (e.g. https://trustledger.app). */
	appUrl: string;
	/** For deadline reminders: which deadline, and the unix timestamp it falls on. */
	deadlineKind?: DeadlineKind;
	deadlineTs?: number;
	/** Optional human detail surfaced in the body (e.g. a rating score or ruling outcome). */
	detail?: string;
}

/** A rendered email ready to hand to {@link sendEmail}. */
export interface RenderedNotification {
	subject: string;
	html: string;
}

/** Format a unix-seconds timestamp as a readable UTC date-time for emails. */
function formatTs(ts: number): string {
	return new Date(ts * 1000).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	});
}

/** Human label for each deadline kind, used in subjects and bodies. */
const DEADLINE_LABEL: Record<DeadlineKind, string> = {
	project: "project delivery deadline",
	acceptance: "review (acceptance) window",
	warranty: "warranty period",
};

/**
 * Render a lifecycle notification into a subject + HTML body.
 *
 * Pure: it performs no I/O and depends only on its arguments, so it can be
 * snapshot-tested. Sending is the caller's job (see {@link sendEmail}).
 *
 * @example
 * const { subject, html } = buildNotification("work_submitted", {
 *   contractId: "12", appUrl: "https://trustledger.app",
 * });
 */
export function buildNotification(
	type: NotificationType,
	data: NotificationData,
): RenderedNotification {
	const cta = { label: "Open Dashboard", href: `${data.appUrl}/dashboard` };
	const contractId = escapeEmailHtml(data.contractId);
	const detail = data.detail !== undefined ? escapeEmailHtml(data.detail) : undefined;
	const tag = `TrustLedger #${data.contractId}`;

	switch (type) {
		case "contract_offer":
			return {
				subject: `New contract offer — ${tag}`,
				html: emailShell(
					"New contract offer",
					`Contract <strong>#${contractId}</strong> is awaiting your review and acceptance. Connect your wallet to view the terms and accept or reject the offer.`,
					cta,
				),
			};
		case "work_submitted":
			return {
				subject: `Work submitted for review — ${tag}`,
				html: emailShell(
					"Deliverable submitted",
					`The freelancer submitted proof-of-work for contract <strong>#${contractId}</strong>. Review it and approve the work or open a dispute before the acceptance window closes.`,
					cta,
				),
			};
		case "work_approved":
			return {
				subject: `Work approved — ${tag}`,
				html: emailShell(
					"Work approved",
					`The client approved your deliverable for contract <strong>#${contractId}</strong>. Payment has been released according to the escrow terms.`,
					cta,
				),
			};
		case "dispute_opened":
			return {
				subject: `Dispute opened — ${tag}`,
				html: emailShell(
					"Dispute opened",
					`A dispute was opened on contract <strong>#${contractId}</strong> and routed to arbitration. Submit your evidence so jurors can review both sides before ruling.`,
					cta,
				),
			};
		case "dispute_resolved":
			return {
				subject: `Dispute resolved — ${tag}`,
				html: emailShell(
					"Dispute resolved",
					`Arbitration executed a ruling on contract <strong>#${contractId}</strong>.${
						detail !== undefined ? ` ${detail}` : ""
					} Funds were distributed according to the jurors' decision.`,
					cta,
				),
			};
		case "rating_received":
			return {
				subject: `New rating received — ${tag}`,
				html: emailShell(
					"New reputation rating",
					`Your counterparty submitted a rating for contract <strong>#${contractId}</strong>.${
						detail !== undefined ? ` ${detail}` : ""
					} Visit your reputation page to see how it affects your score.`,
					{ label: "View Reputation", href: `${data.appUrl}/reputation` },
				),
			};
		case "deadline_reminder": {
			const kind = data.deadlineKind ?? "project";
			const label = DEADLINE_LABEL[kind];
			const whenLine =
				data.deadlineTs !== undefined
					? ` It falls on <strong>${formatTs(data.deadlineTs)} UTC</strong>.`
					: "";
			return {
				subject: `Reminder: ${label} approaching — ${tag}`,
				html: emailShell(
					"Deadline reminder",
					`The ${label} for contract <strong>#${contractId}</strong> is approaching.${whenLine} Take action before it elapses to avoid an automatic on-chain outcome (for example a reclaim or auto-release).`,
					cta,
				),
			};
		}
	}
}

/** Minimal contract shape the deadline scanner needs. Mirrors the on-chain struct subset. */
export interface DeadlineScanContract {
	id: string;
	/** 0=PENDING 1=ACTIVE 2=SUBMITTED 3=APPROVED 4=DISPUTED 5=RESOLVED 6=CANCELLED. */
	status: number;
	client: string;
	freelancer: string;
	projectDeadline: number; // unix seconds
	acceptanceDeadline: number; // unix seconds (0 when not yet submitted)
	warrantyDeadline: number; // unix seconds (0 when no warranty)
}

/** One reminder the scanner decided should be sent. */
export interface DeadlineReminder {
	contractId: string;
	kind: DeadlineKind;
	deadlineTs: number;
	/** Address that should act on this deadline (the one we try to email). */
	recipient: string;
	/** Whether the deadline is still upcoming (`true`) or already passed (`false`). */
	upcoming: boolean;
}

/**
 * Decide which contracts have a deadline worth emailing about.
 *
 * For each open contract we look at the deadline relevant to its current status:
 *   - ACTIVE (1)    → `projectDeadline`,    actionable by the freelancer (submit work).
 *   - SUBMITTED (2) → `acceptanceDeadline`, actionable by the client (approve/dispute).
 *   - APPROVED (3)  → `warrantyDeadline`,   actionable by the freelancer (claim holdback).
 *
 * A reminder is emitted when the deadline is within `windowSeconds` ahead of
 * `nowSeconds` (upcoming) or within `windowSeconds` behind it (just passed — so a
 * party who missed it still gets one nudge). Deadlines of 0 (unset) are skipped.
 *
 * Pure and side-effect-free so it can be unit-tested without a chain or an inbox.
 *
 * @param contracts    Open contracts to scan.
 * @param nowSeconds   Current time in unix seconds.
 * @param windowSeconds Look-ahead/look-back window (default 48h).
 */
export function findDeadlineReminders(
	contracts: DeadlineScanContract[],
	nowSeconds: number,
	windowSeconds = 48 * 60 * 60,
): DeadlineReminder[] {
	const reminders: DeadlineReminder[] = [];

	for (const c of contracts) {
		let kind: DeadlineKind | undefined;
		let deadlineTs = 0;
		let recipient = "";

		if (c.status === 1) {
			kind = "project";
			deadlineTs = c.projectDeadline;
			recipient = c.freelancer;
		} else if (c.status === 2) {
			kind = "acceptance";
			deadlineTs = c.acceptanceDeadline;
			recipient = c.client;
		} else if (c.status === 3) {
			kind = "warranty";
			deadlineTs = c.warrantyDeadline;
			recipient = c.freelancer;
		}

		if (kind === undefined || deadlineTs === 0) continue;

		const delta = deadlineTs - nowSeconds; // >0 upcoming, <0 already passed
		if (delta <= windowSeconds && delta >= -windowSeconds) {
			reminders.push({
				contractId: c.id,
				kind,
				deadlineTs,
				recipient,
				upcoming: delta >= 0,
			});
		}
	}

	return reminders;
}
