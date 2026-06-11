"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface GitHubAnalyticsSummary {
	readonly available: true;
	readonly repository: {
		readonly fullName: string;
		readonly url: string;
		readonly defaultBranch: string;
		readonly pushedAt: string | null;
	};
	readonly metrics: {
		readonly commits: number | null;
		readonly pullRequests: number | null;
		readonly stars: number;
		readonly forks: number;
		readonly watchers: number;
		readonly openIssues: number;
		readonly repositorySizeKb: number;
		readonly additions: number | null;
		readonly deletions: number | null;
		readonly changedLines: number | null;
		readonly topLanguage: string | null;
		readonly languageCount: number;
	};
	readonly checkedAt: string;
}

type GitHubAnalyticsResponse = GitHubAnalyticsSummary | { readonly available: false };

function formatMetric(value: number | null, fallback: string): string {
	return value === null ? fallback : new Intl.NumberFormat().format(value);
}

function formatStorage(kilobytes: number): string {
	if (kilobytes >= 1024) {
		return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(kilobytes / 1024)} MB`;
	}
	return `${new Intl.NumberFormat().format(kilobytes)} KB`;
}

function StatCell({
	label,
	value,
	detail,
}: {
	readonly label: string;
	readonly value: string;
	readonly detail: string;
}): React.JSX.Element {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
			<p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
			<p className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">{value}</p>
			<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{detail}</p>
		</div>
	);
}

export function GitHubStatsSection(): React.JSX.Element | null {
	const t = useTranslations("Status.github");
	const [summary, setSummary] = useState<GitHubAnalyticsSummary | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		async function loadGitHubAnalytics(): Promise<void> {
			try {
				const response = await fetch("/api/analytics/github", {
					headers: { Accept: "application/json" },
					signal: controller.signal,
				});
				if (!response.ok || response.status === 204) return;
				const payload = (await response.json()) as GitHubAnalyticsResponse;
				if (payload.available) setSummary(payload);
			} catch (error) {
				if (!controller.signal.aborted) {
					console.warn("GitHub analytics unavailable", error);
				}
			}
		}
		void loadGitHubAnalytics();
		return (): void => {
			controller.abort();
		};
	}, []);

	if (summary === null) return null;

	const pending = t("pending");
	const topLanguage = summary.metrics.topLanguage ?? t("languageUnknown");
	const updatedLabel =
		summary.repository.pushedAt === null
			? t("updatedUnknown")
			: new Intl.DateTimeFormat(undefined, {
					dateStyle: "medium",
					timeStyle: "short",
				}).format(new Date(summary.repository.pushedAt));

	return (
		<section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
				<div>
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						{t("eyebrow")}
					</p>
					<h2 className="mt-2 text-2xl font-semibold text-gray-950 dark:text-white">
						{t("title")}
					</h2>
					<p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("body", { repository: summary.repository.fullName })}
					</p>
				</div>
				<a
					href={summary.repository.url}
					target="_blank"
					rel="noreferrer"
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
				>
					{t("openRepository")}
				</a>
			</div>

			<div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCell
					label={t("commits")}
					value={formatMetric(summary.metrics.commits, pending)}
					detail={t("defaultBranch", { branch: summary.repository.defaultBranch })}
				/>
				<StatCell
					label={t("pullRequests")}
					value={formatMetric(summary.metrics.pullRequests, pending)}
					detail={t("issues", { count: summary.metrics.openIssues })}
				/>
				<StatCell
					label={t("codeChanges")}
					value={formatMetric(summary.metrics.changedLines, pending)}
					detail={t("lineDelta", {
						additions: formatMetric(summary.metrics.additions, pending),
						deletions: formatMetric(summary.metrics.deletions, pending),
					})}
				/>
				<StatCell
					label={t("community")}
					value={formatMetric(summary.metrics.stars, pending)}
					detail={t("forksWatchers", {
						forks: summary.metrics.forks,
						watchers: summary.metrics.watchers,
					})}
				/>
			</div>

			<dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
				<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-950">
					<dt className="text-gray-500 dark:text-gray-400">{t("topLanguage")}</dt>
					<dd className="font-medium text-gray-900 dark:text-white">
						{t("languageSummary", {
							language: topLanguage,
							count: summary.metrics.languageCount,
						})}
					</dd>
				</div>
				<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-950">
					<dt className="text-gray-500 dark:text-gray-400">{t("repoSize")}</dt>
					<dd className="font-medium text-gray-900 dark:text-white">
						{formatStorage(summary.metrics.repositorySizeKb)}
					</dd>
				</div>
				<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-gray-950">
					<dt className="text-gray-500 dark:text-gray-400">{t("lastPush")}</dt>
					<dd className="text-right font-medium text-gray-900 dark:text-white">
						{updatedLabel}
					</dd>
				</div>
			</dl>
		</section>
	);
}
