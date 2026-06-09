import { buildHealthReport } from "@/services/health";
import { getOracleStatus } from "@/services/oracle";

export interface AdminReportItem {
	readonly label: string;
	readonly status: "ok" | "warning" | "blocked";
	readonly detail: string;
}

interface AdminReportSection {
	readonly title: string;
	readonly description: string;
	readonly items: readonly AdminReportItem[];
}

export interface AdminDashboardReport {
	readonly generatedAt: string;
	readonly readOnly: boolean;
	readonly sections: readonly AdminReportSection[];
}

function hasEnv(name: string): boolean {
	const value = process.env[name];
	return value !== undefined && value !== "";
}

function configuredStatus(name: string): AdminReportItem["status"] {
	return hasEnv(name) ? "ok" : "warning";
}

function configuredDetail(name: string): string {
	return hasEnv(name) ? `${name} is configured.` : `${name} is not configured.`;
}

export function buildAdminDashboardReport(): AdminDashboardReport {
	const health = buildHealthReport();
	const oracle = getOracleStatus();

	return {
		generatedAt: new Date().toISOString(),
		readOnly: true,
		sections: [
			{
				title: "Operational health",
				description: "Runtime and required backend configuration readiness.",
				items: health.checks.map((check) => ({
					label: check.name,
					status: check.ok ? "ok" : "blocked",
					detail: check.detail,
				})),
			},
			{
				title: "Contract and dispute lookup",
				description: "Read-only operational entry points for contract and dispute IDs.",
				items: [
					{
						label: "Contract lookup API",
						status: "ok",
						detail: "Use /api/contract/[id] for JSON-safe on-chain contract aggregation.",
					},
					{
						label: "Dispute review",
						status: "warning",
						detail: "Dedicated dispute search is scaffolded in UI; arbitration drill-down remains read-only.",
					},
				],
			},
			{
				title: "Jurors and reputation",
				description: "Operator visibility into juror eligibility and address reputation.",
				items: [
					{
						label: "Juror status",
						status: configuredStatus("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS"),
						detail: configuredDetail("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS"),
					},
					{
						label: "Reputation history",
						status: configuredStatus("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS"),
						detail: configuredDetail("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS"),
					},
				],
			},
			{
				title: "Notifications and cron",
				description: "Email delivery and scheduled deadline reminder readiness.",
				items: [
					{
						label: "Notification delivery",
						status: configuredStatus("NOTIFICATIONS_SECRET"),
						detail: configuredDetail("NOTIFICATIONS_SECRET"),
					},
					{
						label: "Deadline cron",
						status: configuredStatus("CRON_SECRET"),
						detail: configuredDetail("CRON_SECRET"),
					},
					{
						label: "Recipient map",
						status: configuredStatus("NOTIFICATION_EMAILS"),
						detail: configuredDetail("NOTIFICATION_EMAILS"),
					},
				],
			},
			{
				title: "Oracle freshness",
				description: "Display-rate oracle source, TTL, cache, and supported pairs.",
				items: [
					{
						label: "Provider",
						status: "ok",
						detail: oracle.source,
					},
					{
						label: "TTL",
						status: "ok",
						detail: `${oracle.ttlMs.toString()}ms cache TTL.`,
					},
					{
						label: "Cache entries",
						status: oracle.cache.populated ? "ok" : "warning",
						detail:
							oracle.cache.expiresAt === null
								? "No cached rate entry."
								: `Cached ${oracle.cache.base ?? "unknown"}/${oracle.cache.quote ?? "unknown"} until ${oracle.cache.expiresAt}.`,
					},
				],
			},
			{
				title: "Security reports and deployment",
				description:
					"Dependency/security summaries, deployment metadata, and feature flags.",
				items: [
					{
						label: "Security workflow",
						status: "ok",
						detail: "CodeQL, Semgrep, Slither, TruffleHog, and npm audits run in GitHub Actions.",
					},
					{
						label: "Deployment metadata",
						status: hasEnv("VERCEL_GIT_COMMIT_SHA") ? "ok" : "warning",
						detail:
							process.env["VERCEL_GIT_COMMIT_SHA"] ??
							"Local build or deployment metadata unavailable.",
					},
					{
						label: "Feature flags",
						status: "ok",
						detail: "Read-only admin mode is enforced. Mutating actions remain disabled.",
					},
				],
			},
			{
				title: "Rate limits and audit logs",
				description: "Current guardrails for abuse review and future operator actions.",
				items: [
					{
						label: "API rate limiting",
						status: "ok",
						detail: "src/proxy.ts applies a fixed-window API rate limit per client IP.",
					},
					{
						label: "Audit trails",
						status: "warning",
						detail: "Read-only access is covered first; persistent admin action audit logs are required before enabling mutations.",
					},
				],
			},
		],
	};
}
