import "server-only";

import { getPrisma } from "@/lib/db/client";
import type { AnalyticsAggregate } from "@/lib/generated/prisma/client";

/** Truncates a timestamp to UTC midnight so counts bucket by day. */
function toDay(when: Date): Date {
	return new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
}

/**
 * Increments a privacy-preserving aggregate counter for an event type on a day.
 * Stores no wallet addresses, IPs, or user agents — only a bucketed count — so
 * it is safe to retain durably. Mirrors the in-memory analytics collector.
 */
export async function incrementAnalytics(
	eventType: string,
	options: { readonly chainId?: number; readonly when?: Date; readonly by?: number } = {},
): Promise<AnalyticsAggregate> {
	const day = toDay(options.when ?? new Date());
	// 0 = chain-agnostic aggregate (see schema).
	const chainId = options.chainId ?? 0;
	const by = options.by ?? 1;
	return await getPrisma().analyticsAggregate.upsert({
		where: { eventType_day_chainId: { eventType, day, chainId } },
		create: { eventType, day, chainId, count: by },
		update: { count: { increment: by } },
	});
}

/** Returns aggregates within an inclusive day range, oldest first. */
export async function getAnalyticsRange(from: Date, to: Date): Promise<AnalyticsAggregate[]> {
	return await getPrisma().analyticsAggregate.findMany({
		where: { day: { gte: toDay(from), lte: toDay(to) } },
		orderBy: { day: "asc" },
	});
}
