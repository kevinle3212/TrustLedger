import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ProjectAgeTimer } from "@/app/[locale]/about/_components/ProjectAgeTimer";

const ABOUT_CARD_KEYS = ["custody", "dispute", "readiness"] as const;

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
	const t = await getTranslations({ locale, namespace: "About" });
	const cards = ABOUT_CARD_KEYS.map((key) => ({
		title: t(`cards.${key}.title`),
		body: t(`cards.${key}.body`),
	}));

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
							href="/dashboard"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("openDashboard")}
						</Link>
						<Link
							href="/status"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("viewStatus")}
						</Link>
					</div>
				</div>
				<ProjectAgeTimer />
			</section>

			<section className="mt-10 grid gap-4 md:grid-cols-3">
				{cards.map(({ title, body }) => (
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
