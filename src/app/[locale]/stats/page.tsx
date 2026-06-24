import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCodebaseStats } from "@/lib/codebaseStats";

export const metadata: Metadata = {
	title: "Project Statistics | TrustLedger",
	description:
		"Lines of code, file and directory counts, and the language breakdown of the TrustLedger codebase.",
};

/** Formats a byte count as a human-readable size using locale-aware numbers. */
function formatSize(bytes: number, formatNumber: (value: number) => string): string {
	const megabytes = bytes / 1024 / 1024;
	if (megabytes >= 1) return `${formatNumber(Math.round(megabytes * 10) / 10)} MB`;
	return `${formatNumber(Math.round(bytes / 1024))} KB`;
}

export default async function StatsPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);
	const [t, format] = await Promise.all([
		getTranslations({ locale, namespace: "Stats" }),
		getFormatter({ locale }),
	]);
	const stats = getCodebaseStats();

	const formatNumber = (value: number): string => format.number(value);
	const generatedDate = format.dateTime(new Date(stats.generatedAt), { dateStyle: "long" });

	const summaryCards = [
		{ label: t("statLines"), value: formatNumber(stats.totals.lines) },
		{ label: t("statFiles"), value: formatNumber(stats.totals.files) },
		{ label: t("statDirectories"), value: formatNumber(stats.totals.directories) },
		{ label: t("statLanguages"), value: formatNumber(stats.totals.languages) },
		{ label: t("statSize"), value: formatSize(stats.totals.bytes, formatNumber) },
	];

	return (
		<main className="tl-app-shell">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div>
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
						{t("eyebrow")}
					</p>
					<h1 className="mt-3 text-4xl font-bold tracking-[-0.025em] text-gray-950 dark:text-white">
						{t("title")}
					</h1>
					<p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("intro")}
					</p>
					<div className="mt-6 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/about"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("viewAbout")}
						</Link>
						<Link
							href="/analytics"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("viewWalletAnalytics")}
						</Link>
					</div>
				</div>
				<aside className="tl-motion-card rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-400/20 dark:bg-indigo-400/10">
					<p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
						{t("generated", { date: generatedDate })}
					</p>
					<p className="mt-2 text-sm leading-6 text-indigo-950 dark:text-indigo-50">
						{t("generatedNote")}
					</p>
				</aside>
			</section>

			<section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				{summaryCards.map(({ label, value }) => (
					<article
						key={label}
						className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5"
					>
						<p className="text-2xl font-bold tabular-nums tracking-tight text-gray-950 dark:text-white">
							{value}
						</p>
						<p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
							{label}
						</p>
					</article>
				))}
			</section>

			<section className="mt-10">
				<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
					{t("languagesTitle")}
				</h2>
				<p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("languagesIntro")}
				</p>
				<ul className="mt-5 grid gap-3">
					{stats.languages.map((language) => (
						<li
							key={language.name}
							className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
						>
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-sm font-semibold text-gray-950 dark:text-white">
									{language.name}
								</span>
								<span className="text-sm tabular-nums text-gray-600 dark:text-gray-300">
									{t("languageMeta", {
										lines: formatNumber(language.lines),
										files: formatNumber(language.files),
										share: formatNumber(language.share),
									})}
								</span>
							</div>
							<div
								className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
								aria-hidden="true"
							>
								<div
									className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
									style={{ width: `${String(language.share)}%` }}
								/>
							</div>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
