import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { adminSessionFromHeaders, isAdminIpAllowed } from "@/services/adminAuth";
import { buildAdminDashboardReport, type AdminReportItem } from "@/services/adminReport";

export const metadata: Metadata = {
	title: "Admin Dashboard - TrustLedger",
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

	return (
		<main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
			<section className="grid gap-6 lg:grid-cols-[1fr_22rem]">
				<div>
					<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
						Restricted Operator Console
					</p>
					<h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white">
						TrustLedger admin dashboard
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
