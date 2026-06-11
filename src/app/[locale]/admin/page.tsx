import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { adminSessionFromHeaders, isAdminIpAllowed } from "@/services/adminAuth";
import { buildAdminDashboardReport, type AdminReportItem } from "@/services/adminReport";
import { summarizeAnalyticsEvents, type AnalyticsEventSummary } from "@/services/trafficAnalytics";

export const metadata: Metadata = {
	title: "Admin Dashboard | TrustLedger",
	description: "Restricted read-only TrustLedger operator dashboard.",
};

function statusClass(status: AdminReportItem["status"]): string {
	switch (status) {
		case "ok":
			return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
		case "warning":
			return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200";
		case "blocked":
			return "border-red-200 bg-red-50 text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200";
	}
}

function countStatuses(sections: ReturnType<typeof buildAdminDashboardReport>["sections"]): {
	readonly ok: number;
	readonly warning: number;
	readonly blocked: number;
	readonly total: number;
} {
	const totals = { ok: 0, warning: 0, blocked: 0 };
	for (const section of sections) {
		for (const item of section.items) {
			totals[item.status] += 1;
		}
	}
	const total = totals.ok + totals.warning + totals.blocked;
	return { ...totals, total };
}

function AdminHealthVisual({
	counts,
}: {
	readonly counts: ReturnType<typeof countStatuses>;
}): React.JSX.Element {
	const total = Math.max(counts.total, 1);
	const segments = [
		{ label: "OK", value: counts.ok, className: "bg-emerald-500" },
		{ label: "Warning", value: counts.warning, className: "bg-amber-500" },
		{ label: "Blocked", value: counts.blocked, className: "bg-red-500" },
	] as const;

	return (
		<article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
						Operational Health
					</h2>
					<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
						Read-only status distribution across server, Vercel, analytics, contracts,
						notifications, oracle, and security checks.
					</p>
				</div>
				<span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-white/10 dark:text-gray-300">
					{counts.total.toString()} Checks
				</span>
			</div>
			<div className="mt-5 flex h-4 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
				{segments.map((segment) => (
					<div
						key={segment.label}
						className={segment.className}
						style={{
							width: `${Math.round((segment.value / total) * 100).toString()}%`,
						}}
					/>
				))}
			</div>
			<div className="mt-5 grid gap-3 sm:grid-cols-3">
				{segments.map((segment) => (
					<div
						key={segment.label}
						className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
					>
						<p className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
							<span className={`h-2.5 w-2.5 rounded-full ${segment.className}`} />
							{segment.label}
						</p>
						<p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
							{segment.value.toString()}
						</p>
					</div>
				))}
			</div>
		</article>
	);
}

function AdminTrafficVisual({
	traffic,
}: {
	readonly traffic: AnalyticsEventSummary;
}): React.JSX.Element {
	const maxPathCount = Math.max(...traffic.topPaths.map((path) => path.count), 1);

	return (
		<article className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
						Traffic Analytics
					</h2>
					<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
						Aggregate page views and frontend errors. Private wallet data, IPs, user
						agents, cookies, and query strings are excluded.
					</p>
				</div>
				<span
					className={`rounded-full border px-3 py-1 text-xs font-semibold ${
						traffic.enabled
							? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
							: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
					}`}
				>
					{traffic.enabled ? "Enabled" : "Local Only"}
				</span>
			</div>
			<div className="mt-5 grid gap-3 sm:grid-cols-3">
				<div className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
					<p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Events</p>
					<p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
						{traffic.totalEvents.toString()}
					</p>
				</div>
				<div className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
					<p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
						Page Views
					</p>
					<p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
						{traffic.pageViews.toString()}
					</p>
				</div>
				<div className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
					<p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
						Frontend Errors
					</p>
					<p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
						{traffic.frontendErrors.toString()}
					</p>
				</div>
			</div>
			<div className="mt-5 grid gap-3">
				{traffic.topPaths.length === 0 ? (
					<p className="rounded-xl border border-gray-200 p-3 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
						No aggregate traffic events are stored for the current runtime.
					</p>
				) : (
					traffic.topPaths.map((path) => (
						<div key={path.path} className="grid gap-2">
							<div className="flex items-center justify-between gap-4 text-sm">
								<span className="truncate font-medium text-gray-700 dark:text-gray-200">
									{path.path}
								</span>
								<span className="font-mono text-gray-500 dark:text-gray-400">
									{path.count.toString()}
								</span>
							</div>
							<div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
								<div
									className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
									style={{
										width: `${Math.max(8, Math.round((path.count / maxPathCount) * 100)).toString()}%`,
									}}
								/>
							</div>
						</div>
					))
				)}
			</div>
		</article>
	);
}

export default async function AdminPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);

	const headerList = await headers();
	if (!isAdminIpAllowed(headerList)) redirect(`/${locale}/admin/sign-in`);

	const session = adminSessionFromHeaders(headerList);
	if (session === undefined) redirect(`/${locale}/admin/sign-in`);

	const report = buildAdminDashboardReport();
	const statusCounts = countStatuses(report.sections);
	const traffic = summarizeAnalyticsEvents();

	return (
		<main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
			<section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
				<div>
					<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
						Restricted Operator Console
					</p>
					<h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white">
						TrustLedger Admin Dashboard
					</h1>
					<p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						Read-only operational overview for health, contracts, disputes, jurors,
						reputation, notifications, oracle freshness, deployment metadata, security
						reports, rate limits, and audit-readiness.
					</p>
				</div>
				<aside className="rounded-2xl border border-gray-200 bg-white p-5 text-sm dark:border-white/10 dark:bg-gray-950">
					<p className="font-semibold text-gray-950 dark:text-white">
						{session.username}
					</p>
					<p className="mt-1 text-gray-600 dark:text-gray-300">{session.email}</p>
					<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
						Roles: {session.roles.join(", ")}
					</p>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Mode: {report.readOnly ? "read-only" : "mutating actions enabled"}
					</p>
				</aside>
			</section>

			<section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
				Admin mutations are disabled. Future actions must require explicit confirmation,
				server-side authorization, and persistent audit trails before they are enabled.
			</section>

			<section
				aria-label="Admin deployment and analytics metrics"
				className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
			>
				{report.metrics.map((metric) => (
					<article
						key={metric.label}
						className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5"
					>
						<p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
							{metric.label}
						</p>
						<p className="mt-2 text-2xl font-bold tracking-[-0.015em] text-gray-950 dark:text-white">
							{metric.value}
						</p>
						<p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
							{metric.detail}
						</p>
					</article>
				))}
			</section>

			<section className="grid gap-4 xl:grid-cols-2">
				<AdminHealthVisual counts={statusCounts} />
				<AdminTrafficVisual traffic={traffic} />
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{report.sections.map((section) => (
					<article
						key={section.title}
						className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-950"
					>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							{section.title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{section.description}
						</p>
						<div className="mt-4 grid gap-3">
							{section.items.map((item) => (
								<div
									key={`${section.title}-${item.label}`}
									className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
								>
									<div className="flex items-center justify-between gap-3">
										<p className="font-semibold text-gray-900 dark:text-white">
											{item.label}
										</p>
										<span
											className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
												item.status,
											)}`}
										>
											{item.status}
										</span>
									</div>
									<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
										{item.detail}
									</p>
								</div>
							))}
						</div>
					</article>
				))}
			</section>

			<section className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-3">
				<label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
					Contract ID
					<input
						readOnly
						placeholder="Read-only lookup scaffold"
						className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal text-gray-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-400"
					/>
				</label>
				<label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
					Dispute ID
					<input
						readOnly
						placeholder="Read-only lookup scaffold"
						className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal text-gray-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-400"
					/>
				</label>
				<label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
					Wallet address
					<input
						readOnly
						placeholder="Read-only lookup scaffold"
						className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal text-gray-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-400"
					/>
				</label>
			</section>
		</main>
	);
}
