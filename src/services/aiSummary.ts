// AI-powered plain-English summaries of contracts and disputes via Claude.
//
// All functions are server-only: they read ANTHROPIC_API_KEY at call time and
// must never be imported into a client component (the key would leak into the
// browser bundle). Import these from API routes and other server modules only.
//
// Summaries are intentionally short (2–4 sentences) so they can be surfaced
// inline on dashboard cards without requiring a separate "expand" interaction.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

/** Result of a summary request. Discriminated on `ok`. */
export type SummaryResult = { ok: true; summary: string } | { ok: false; error: string };

/** On-chain contract data needed to generate a plain-English summary. */
export interface ContractSummaryInput {
	id: string;
	clientAddress: string;
	freelancerAddress: string;
	/** Escrow amount in wei. */
	value: string;
	/** Unix timestamp (seconds). */
	projectDeadline: number;
	/** 0=PENDING 1=ACTIVE 2=SUBMITTED 3=APPROVED 4=DISPUTED 5=RESOLVED 6=CANCELLED */
	status: number;
	/** Optional IPFS CID of the off-chain job description. */
	descriptionCid?: string;
}

/** Dispute data needed to generate a juror-facing summary. */
export interface DisputeSummaryInput {
	contractId: string;
	clientAddress: string;
	freelancerAddress: string;
	/** IPFS CID of the evidence bundle, if already uploaded. */
	evidenceCid?: string;
	/** Freeform text evidence supplied by either party. */
	evidenceText?: string;
}

const STATUS_LABEL: Record<number, string> = {
	0: "Pending",
	1: "Active",
	2: "Submitted for review",
	3: "Approved",
	4: "Disputed",
	5: "Resolved",
	6: "Cancelled",
};

/**
 * Generate a 2–3 sentence plain-English summary of a TrustLedger contract.
 *
 * Intended for dashboard cards so non-technical parties can understand the
 * contract state at a glance without reading raw on-chain data.
 *
 * Reads `ANTHROPIC_API_KEY` from the environment; fails cleanly if unset.
 * Never throws: API and config errors are returned as `{ ok: false, error }`.
 *
 * @example
 * const res = await summarizeContract({
 *   id: "42", clientAddress: "0xABC…", freelancerAddress: "0xDEF…",
 *   value: "1000000000000000000", projectDeadline: 1740000000, status: 1,
 * });
 * if (res.ok) card.summary = res.summary;
 */
export async function summarizeContract(data: ContractSummaryInput): Promise<SummaryResult> {
	const apiKey = process.env["ANTHROPIC_API_KEY"];
	if (apiKey === undefined || apiKey === "") {
		return { ok: false, error: "ANTHROPIC_API_KEY not set" };
	}

	const deadlineDate = new Date(data.projectDeadline * 1000).toUTCString();
	const statusLabel = STATUS_LABEL[data.status] ?? `Unknown (${String(data.status)})`;
	// Integer ETH value — wei is too granular for a human summary.
	const valueEth = (BigInt(data.value) / BigInt(1e18)).toString();

	const prompt = `You are a plain-English assistant for TrustLedger, a smart-contract escrow platform for freelance work.

Summarise the following contract in 2–3 sentences for a non-technical reader. Cover: who the parties are (abbreviated wallet addresses are fine), the current stage, and the key deadline. Do not use bullet points. Do not repeat field names verbatim.

Contract #${data.id}:
- Client: ${data.clientAddress}
- Freelancer: ${data.freelancerAddress}
- Escrow value: ${valueEth} ETH
- Status: ${statusLabel}
- Project deadline: ${deadlineDate} UTC${data.descriptionCid !== undefined ? `\n- Off-chain description CID: ${data.descriptionCid}` : ""}`;

	try {
		const client = new Anthropic({ apiKey });
		const message = await client.messages.create({
			model: MODEL,
			max_tokens: 256,
			messages: [{ role: "user", content: prompt }],
		});

		const text = message.content
			.filter((b): b is Anthropic.TextBlock => b.type === "text")
			.map((b) => b.text)
			.join("")
			.trim();

		return text.length > 0
			? { ok: true, summary: text }
			: { ok: false, error: "empty response from model" };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "AI summary failed",
		};
	}
}

/**
 * Generate a 3–4 sentence neutral summary of a dispute for jurors.
 *
 * Condenses the available evidence so jurors can reach a ruling faster.
 * The summary is deliberately neutral — it does not suggest a verdict.
 *
 * Reads `ANTHROPIC_API_KEY` from the environment; fails cleanly if unset.
 * Never throws.
 *
 * @example
 * const res = await summarizeDispute({
 *   contractId: "42",
 *   clientAddress: "0xABC…",
 *   freelancerAddress: "0xDEF…",
 *   evidenceText: "Deliverable was incomplete — missing auth module.",
 * });
 * if (res.ok) jurorCard.summary = res.summary;
 */
export async function summarizeDispute(data: DisputeSummaryInput): Promise<SummaryResult> {
	const apiKey = process.env["ANTHROPIC_API_KEY"];
	if (apiKey === undefined || apiKey === "") {
		return { ok: false, error: "ANTHROPIC_API_KEY not set" };
	}

	const prompt = `You are a neutral arbitration assistant for TrustLedger, a smart-contract escrow platform.

Summarise the dispute on contract #${data.contractId} in 3–4 sentences for a juror who must decide the outcome. Cover: who the parties are, what the dispute is about based on the evidence, and the key question the juror must resolve. Use a neutral tone — do not take sides. Do not use bullet points. Do not repeat field names verbatim.

Dispute on contract #${data.contractId}:
- Client: ${data.clientAddress}
- Freelancer: ${data.freelancerAddress}${data.evidenceCid !== undefined ? `\n- Evidence CID: ${data.evidenceCid}` : ""}${data.evidenceText !== undefined ? `\n- Evidence text: ${data.evidenceText}` : ""}`;

	try {
		const client = new Anthropic({ apiKey });
		const message = await client.messages.create({
			model: MODEL,
			max_tokens: 384,
			messages: [{ role: "user", content: prompt }],
		});

		const text = message.content
			.filter((b): b is Anthropic.TextBlock => b.type === "text")
			.map((b) => b.text)
			.join("")
			.trim();

		return text.length > 0
			? { ok: true, summary: text }
			: { ok: false, error: "empty response from model" };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "AI summary failed",
		};
	}
}
