import "server-only";

import { createHash } from "node:crypto";

export type ContractSummaryProvider = "disabled" | "groq" | "gemini";

export interface ContractSummaryInput {
	readonly contractId: string;
	readonly contractHash: string;
	readonly statusLabel: string;
	readonly client: string;
	readonly freelancer: string;
	readonly amount: string;
	readonly tokenSymbol: "ETH" | "USDC" | "SOL" | "Unknown";
	readonly projectDeadlineIso: string | null;
	readonly acceptanceDeadlineIso: string | null;
	readonly warrantyDeadlineIso: string | null;
	readonly holdBackBps: number;
	readonly proposedByClient?: boolean;
	readonly sourceMetadataVersion: string;
}

export interface ContractSummary {
	readonly provider: ContractSummaryProvider;
	readonly cacheKey: string;
	readonly cached: boolean;
	readonly summary: string;
	readonly status: "generated" | "fallback" | "disabled";
	readonly latencyMs: number;
	readonly costUsdEstimate: number;
}

export interface ContractSummaryMetrics {
	readonly calls: number;
	readonly cacheHits: number;
	readonly providerErrors: number;
	readonly totalLatencyMs: number;
	readonly estimatedCostUsd: number;
}

const SUMMARY_CACHE = new Map<string, ContractSummary>();
const METRICS: ContractSummaryMetrics = {
	calls: 0,
	cacheHits: 0,
	providerErrors: 0,
	totalLatencyMs: 0,
	estimatedCostUsd: 0,
};

function provider(): ContractSummaryProvider {
	const value = process.env["AI_SUMMARY_PROVIDER"]?.trim().toLowerCase();
	if (value === "groq" || value === "gemini") return value;
	return "disabled";
}

function cacheKey(input: ContractSummaryInput): string {
	return createHash("sha256")
		.update(
			[
				input.contractId,
				input.contractHash,
				input.statusLabel,
				input.sourceMetadataVersion,
			].join(":"),
		)
		.digest("hex");
}

function redactAddress(address: string): string {
	if (address.length <= 12) return address;
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function fallbackSummary(input: ContractSummaryInput): string {
	const deadline =
		input.projectDeadlineIso === null
			? "with no project deadline set yet"
			: `with a project deadline of ${input.projectDeadlineIso}`;
	const proposer = input.proposedByClient === false ? "freelancer-proposed" : "client-proposed";
	return `Contract #${input.contractId} is ${input.statusLabel}. It is a ${proposer} ${input.tokenSymbol} escrow for ${input.amount}, between ${redactAddress(input.client)} and ${redactAddress(input.freelancer)}, ${deadline}. Hold-back is ${(input.holdBackBps / 100).toFixed(2)}%.`;
}

function prompt(input: ContractSummaryInput): string {
	return [
		"Summarize this public escrow contract in one concise, user-facing paragraph.",
		"Do not infer private facts. Do not ask for private keys, seed phrases, session keys, encrypted documents, unrelated wallet history, or raw documents.",
		JSON.stringify({
			contractId: input.contractId,
			status: input.statusLabel,
			client: redactAddress(input.client),
			freelancer: redactAddress(input.freelancer),
			amount: input.amount,
			tokenSymbol: input.tokenSymbol,
			projectDeadlineIso: input.projectDeadlineIso,
			acceptanceDeadlineIso: input.acceptanceDeadlineIso,
			warrantyDeadlineIso: input.warrantyDeadlineIso,
			holdBackBps: input.holdBackBps,
			proposedByClient: input.proposedByClient,
		}),
	].join("\n");
}

async function callGroq(input: ContractSummaryInput): Promise<string> {
	const apiKey = process.env["GROQ_API_KEY"];
	if (apiKey === undefined || apiKey === "") throw new Error("GROQ_API_KEY not set");
	const model = process.env["GROQ_MODEL"] ?? "llama-3.3-70b-versatile";
	const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
		method: "POST",
		headers: {
			"authorization": `Bearer ${apiKey}`,
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model,
			temperature: 0.2,
			max_tokens: 120,
			messages: [
				{
					role: "system",
					content:
						"You write precise escrow-contract summaries for a privacy-focused SaaS product.",
				},
				{ role: "user", content: prompt(input) },
			],
		}),
	});
	if (!response.ok) throw new Error(`Groq summary failed: ${response.status.toString()}`);
	const body = (await response.json()) as {
		choices?: readonly { message?: { content?: string } }[];
	};
	const content = body.choices?.[0]?.message?.content?.trim();
	if (content === undefined || content === "") throw new Error("Groq returned an empty summary");
	return content;
}

async function callGemini(input: ContractSummaryInput): Promise<string> {
	const apiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_GENERATIVE_AI_API_KEY"];
	if (apiKey === undefined || apiKey === "") throw new Error("GEMINI_API_KEY not set");
	const model = process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash";
	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				generationConfig: { temperature: 0.2, maxOutputTokens: 120 },
				contents: [{ parts: [{ text: prompt(input) }] }],
			}),
		},
	);
	if (!response.ok) throw new Error(`Gemini summary failed: ${response.status.toString()}`);
	const body = (await response.json()) as {
		candidates?: readonly { content?: { parts?: readonly { text?: string }[] } }[];
	};
	const content = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
	if (content === undefined || content === "")
		throw new Error("Gemini returned an empty summary");
	return content;
}

export function getContractSummaryMetrics(): ContractSummaryMetrics {
	return { ...METRICS };
}

export function resetContractSummaryForTests(): void {
	SUMMARY_CACHE.clear();
	(METRICS as { calls: number }).calls = 0;
	(METRICS as { cacheHits: number }).cacheHits = 0;
	(METRICS as { providerErrors: number }).providerErrors = 0;
	(METRICS as { totalLatencyMs: number }).totalLatencyMs = 0;
	(METRICS as { estimatedCostUsd: number }).estimatedCostUsd = 0;
}

export async function summarizeContract(input: ContractSummaryInput): Promise<ContractSummary> {
	const key = cacheKey(input);
	const cached = SUMMARY_CACHE.get(key);
	if (cached !== undefined) {
		(METRICS as { cacheHits: number }).cacheHits += 1;
		return { ...cached, cached: true };
	}

	const selectedProvider = provider();
	const started = Date.now();
	(METRICS as { calls: number }).calls += 1;

	let summary = fallbackSummary(input);
	let status: ContractSummary["status"] =
		selectedProvider === "disabled" ? "disabled" : "fallback";

	if (selectedProvider !== "disabled") {
		try {
			summary = selectedProvider === "groq" ? await callGroq(input) : await callGemini(input);
			status = "generated";
		} catch {
			(METRICS as { providerErrors: number }).providerErrors += 1;
		}
	}

	const latencyMs = Date.now() - started;
	const result: ContractSummary = {
		provider: selectedProvider,
		cacheKey: key,
		cached: false,
		summary,
		status,
		latencyMs,
		costUsdEstimate: status === "generated" ? 0.0002 : 0,
	};
	(METRICS as { totalLatencyMs: number }).totalLatencyMs += latencyMs;
	(METRICS as { estimatedCostUsd: number }).estimatedCostUsd += result.costUsdEstimate;
	SUMMARY_CACHE.set(key, result);
	return result;
}
