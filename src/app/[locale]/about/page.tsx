import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ProjectAgeTimer } from "@/app/[locale]/about/_components/ProjectAgeTimer";

export const metadata: Metadata = {
	title: "About - TrustLedger",
	description: "Project background, public resources, and TrustLedger timeline.",
};

export default async function AboutPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<main className="tl-app-shell">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div>
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
						About TrustLedger
					</p>
					<h1 className="mt-3 text-4xl font-bold tracking-[-0.025em] text-gray-950 dark:text-white">
						Escrow infrastructure for freelance work.
					</h1>
					<p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						TrustLedger combines EVM smart-contract custody, encrypted contract
						drafting, privacy-safe analytics, juror arbitration, and reputation history
						into one open-source workflow. This page is intentionally small for now so
						project background can grow without cluttering the task surfaces.
					</p>
					<div className="mt-6 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/dashboard"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							Open Dashboard
						</Link>
						<Link
							href="/status"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							View Public Status
						</Link>
					</div>
				</div>
				<ProjectAgeTimer />
			</section>

			<section className="mt-10 grid gap-4 md:grid-cols-3">
				{[
					[
						"Custody",
						"Escrow state and payout rules live in smart contracts. The app explains states and actions without taking custody.",
					],
					[
						"Dispute Resolution",
						"Staked jurors use commit-reveal voting so contested work can resolve without a platform operator deciding the result.",
					],
					[
						"Operational Readiness",
						"CI, docs, audit-readiness reports, and admin observability are treated as product features, not afterthoughts.",
					],
				].map(([title, body]) => (
					<article
						key={title}
						className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5"
					>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							{title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{body}
						</p>
					</article>
				))}
			</section>
		</main>
	);
}
