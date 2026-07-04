import "server-only";

import { createHash } from "node:crypto";
import { defaultProviderName, generateText, isAiEnabled, type AiMessage } from "@/core/ai";
import { REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

/**
 * Name of the resolved `@/core/ai` provider that produced a summary (e.g.
 * `"default"`, `"groq"`, `"gemini"`), or `"disabled"` when the feature is off.
 */
export type ContractSummaryProvider = string;

/** Structured contract metadata passed to the AI summariser. */
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

/** Result returned by the contract summary service, including the generated text and telemetry. */
export interface ContractSummary {
	readonly provider: ContractSummaryProvider;
	readonly cacheKey: string;
	readonly cached: boolean;
	readonly summary: string;
	readonly status: "generated" | "fallback" | "disabled";
	readonly latencyMs: number;
	readonly costUsdEstimate: number;
}

/** Aggregated telemetry for the contract summary service (calls, cache hits, errors, latency, cost). */
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

function promptMessages(input: ContractSummaryInput): AiMessage[] {
	return [
		{
			role: "system",
			content:
				"You write precise escrow-contract summaries for a privacy-focused SaaS product.",
		},
		{
			role: "user",
			content: [
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
			].join("\n"),
		},
	];
}

/**
 * Returns aggregate metrics about AI contract-summary usage (provider, counts,
 * cache state) for the status/admin surfaces.
 *
 * @returns The current {@link ContractSummaryMetrics}.
 */
export function getContractSummaryMetrics(): ContractSummaryMetrics {
	return { ...METRICS };
}

/**
 * Resets cached summaries and metrics. Test-only helper for deterministic
 * behavior between cases.
 */
export function resetContractSummaryForTests(): void {
	SUMMARY_CACHE.clear();
	(METRICS as { calls: number }).calls = 0;
	(METRICS as { cacheHits: number }).cacheHits = 0;
	(METRICS as { providerErrors: number }).providerErrors = 0;
	(METRICS as { totalLatencyMs: number }).totalLatencyMs = 0;
	(METRICS as { estimatedCostUsd: number }).estimatedCostUsd = 0;
}

/**
 * Produces a human-readable summary of an escrow contract, using the configured
 * AI provider when enabled and falling back to a deterministic template
 * otherwise. Results are cached.
 *
 * @param input - Contract fields to summarize ({@link ContractSummaryInput}).
 * @returns The generated {@link ContractSummary}.
 */
export async function summarizeContract(input: ContractSummaryInput): Promise<ContractSummary> {
	const key = cacheKey(input);
	const cached = SUMMARY_CACHE.get(key);
	if (cached !== undefined) {
		(METRICS as { cacheHits: number }).cacheHits += 1;
		return { ...cached, cached: true };
	}

	const enabled = isAiEnabled();
	const started = Date.now();
	(METRICS as { calls: number }).calls += 1;

	let summary = fallbackSummary(input);
	let status: ContractSummary["status"] = enabled ? "fallback" : "disabled";
	// Default to the provider the router would attempt so a failed call still
	// reports which vendor was tried, not a misleading "disabled".
	let selectedProvider: ContractSummaryProvider = enabled ? defaultProviderName() : "disabled";

	if (enabled) {
		try {
			// The router picks the provider/model for the "summary" task; this call
			// site never names a vendor. An abort signal preserves the prior timeout.
			const result = await generateText({
				task: "summary",
				messages: promptMessages(input),
				temperature: 0.2,
				maxOutputTokens: 120,
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS.aiSummary),
			});
			selectedProvider = result.provider;
			const text = result.text.trim();
			if (result.placeholder || text === "") {
				status = result.placeholder ? "disabled" : "fallback";
			} else {
				summary = text;
				status = "generated";
			}
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
