type AnalyticsEventName = "page_view" | "frontend_error";

/** Input for recording a single privacy-safe analytics event. */
export interface AnalyticsEventInput {
	readonly name: AnalyticsEventName;
	readonly path: string;
	readonly locale?: string;
	readonly referrer?: string;
	readonly occurredAt?: string;
}

/** A stored analytics event record after normalisation (referrer stripped, locale clamped). */
export interface AnalyticsEventRecord {
	readonly name: AnalyticsEventName;
	readonly path: string;
	readonly locale: string;
	readonly occurredAt: string;
}

/** Aggregated analytics summary returned by `GET /api/analytics/events`. */
export interface AnalyticsEventSummary {
	readonly enabled: boolean;
	readonly retentionDays: number;
	readonly totalEvents: number;
	readonly pageViews: number;
	readonly frontendErrors: number;
	readonly topPaths: readonly { readonly path: string; readonly count: number }[];
	readonly privacyBoundary: readonly string[];
}

const DEFAULT_RETENTION_DAYS = 30;
const MAX_EVENTS = 1_000;
const globalStore = globalThis as typeof globalThis & {
	__trustledgerAnalyticsEvents?: AnalyticsEventRecord[];
};

function store(): AnalyticsEventRecord[] {
	globalStore.__trustledgerAnalyticsEvents ??= [];
	return globalStore.__trustledgerAnalyticsEvents;
}

function analyticsEnabled(): boolean {
	return process.env["TRUSTLEDGER_ANALYTICS_ENABLED"] === "true";
}

function analyticsRetentionDays(): number {
	const parsed = Number.parseInt(process.env["TRUSTLEDGER_ANALYTICS_RETENTION_DAYS"] ?? "", 10);
	if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) return DEFAULT_RETENTION_DAYS;
	return parsed;
}

/**
 * Reports whether the request opted out of analytics via privacy signals (for
 * example Do-Not-Track / Global Privacy Control).
 *
 * @param headers - Incoming request headers.
 * @returns `true` when the event must not be recorded.
 */
export function shouldRespectPrivacyHeaders(headers: Headers): boolean {
	return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

function sanitizePath(path: string): string {
	const parsed = path.startsWith("/") ? path : "/";
	const withoutQuery = parsed.split("?")[0]?.slice(0, 160) ?? "/";
	return withoutQuery === "" ? "/" : withoutQuery;
}

function sanitizeLocale(locale: string | undefined): string {
	if (locale === undefined || !/^[a-z]{2}(?:-[A-Z]{2})?$/u.test(locale)) return "unknown";
	return locale;
}

function pruneExpired(now = Date.now()): void {
	const retentionMs = analyticsRetentionDays() * 24 * 60 * 60 * 1000;
	const cutoff = now - retentionMs;
	const retained = store().filter((event) => Date.parse(event.occurredAt) >= cutoff);
	if (retained.length > MAX_EVENTS) {
		retained.splice(0, retained.length - MAX_EVENTS);
	}
	globalStore.__trustledgerAnalyticsEvents = retained;
}

/**
 * Records a privacy-safe analytics event in the in-memory aggregate store.
 *
 * @param input - Validated event input ({@link AnalyticsEventInput}).
 * @returns The stored {@link AnalyticsEventRecord}, or `null` when the event is
 *   dropped (for example by sampling).
 */
export function recordAnalyticsEvent(input: AnalyticsEventInput): AnalyticsEventRecord | null {
	if (!analyticsEnabled()) return null;
	pruneExpired();
	const record: AnalyticsEventRecord = {
		name: input.name,
		path: sanitizePath(input.path),
		locale: sanitizeLocale(input.locale),
		occurredAt: input.occurredAt ?? new Date().toISOString(),
	};
	store().push(record);
	pruneExpired();
	return record;
}

/**
 * Produces an aggregated, non-identifying summary of recorded analytics events.
 *
 * @returns An {@link AnalyticsEventSummary} of counts and breakdowns.
 */
export function summarizeAnalyticsEvents(): AnalyticsEventSummary {
	pruneExpired();
	const events = store();
	const pathCounts = new Map<string, number>();
	for (const event of events) {
		pathCounts.set(event.path, (pathCounts.get(event.path) ?? 0) + 1);
	}
	return {
		enabled: analyticsEnabled(),
		retentionDays: analyticsRetentionDays(),
		totalEvents: events.length,
		pageViews: events.filter((event) => event.name === "page_view").length,
		frontendErrors: events.filter((event) => event.name === "frontend_error").length,
		topPaths: Array.from(pathCounts.entries())
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([path, count]) => ({ path, count })),
		privacyBoundary: [
			"No cookies",
			"No wallet addresses",
			"No raw IP addresses",
			"No user agents",
			"No query strings",
			"Do Not Track and Global Privacy Control respected",
		],
	};
}
