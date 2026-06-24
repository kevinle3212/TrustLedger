import { RECENT_DISPUTE_LOOKBACK } from "@/utils/arbitration";

/**
 * Returns the `RECENT_DISPUTE_LOOKBACK` most recent dispute IDs in descending order.
 *
 * @param nextDisputeId - The next sequential dispute ID from the contract (i.e., current count).
 */
export function getRecentDisputeIds(nextDisputeId: bigint | undefined): bigint[] {
	if (nextDisputeId === undefined || nextDisputeId === 0n) return [];
	const start =
		nextDisputeId > RECENT_DISPUTE_LOOKBACK ? nextDisputeId - RECENT_DISPUTE_LOOKBACK : 0n;
	const ids: bigint[] = [];
	for (let id = start; id < nextDisputeId; id += 1n) {
		ids.unshift(id);
	}
	return ids;
}
