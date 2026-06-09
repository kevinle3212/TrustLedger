import { normalizeEvidenceSummary } from "@/utils/arbitration";

export interface EvidenceDraft {
	summary: string;
	uri: string;
	requestedCompletionPct: number;
	updatedAt: number;
}

function storageKey(disputeId: bigint | string): string {
	return `tl-arbitration-evidence-${disputeId.toString()}`;
}

export function readEvidenceDraft(disputeId: bigint | string): EvidenceDraft | undefined {
	if (typeof window === "undefined") return undefined;
	const raw = window.localStorage.getItem(storageKey(disputeId));
	if (raw === null) return undefined;
	try {
		const parsed = JSON.parse(raw) as Partial<EvidenceDraft>;
		if (
			typeof parsed.summary !== "string" ||
			typeof parsed.uri !== "string" ||
			typeof parsed.requestedCompletionPct !== "number"
		) {
			return undefined;
		}
		return {
			summary: parsed.summary,
			uri: parsed.uri,
			requestedCompletionPct: parsed.requestedCompletionPct,
			updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
		};
	} catch {
		return undefined;
	}
}

export function writeEvidenceDraft(
	disputeId: bigint | string,
	draft: Omit<EvidenceDraft, "updatedAt">,
): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(
		storageKey(disputeId),
		JSON.stringify({
			...draft,
			summary: normalizeEvidenceSummary(draft.summary),
			updatedAt: Date.now(),
		}),
	);
}

export function clearEvidenceDraft(disputeId: bigint | string): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(storageKey(disputeId));
}
