import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ProjectAgeTimer } from "@/app/[locale]/about/_components/ProjectAgeTimer";

const ABOUT_CARD_KEYS = ["custody", "dispute", "readiness"] as const;

/**
 * Founding team, rendered from CREDITS.md. Names come through JSX expressions
 * (not literals) and LinkedIn URLs are public profile links, so no locale
 * message is needed for them; roles and bios are translated.
 */
const FOUNDERS = [
	{
		name: "Kevin Le",
		initials: "KL",
		roleKey: "roleLead",
		bioKey: "bioKevin",
		linkedin: "https://www.linkedin.com/in/lekevin1",
	},
	{
		name: "Kellen Snider",
		initials: "KS",
		roleKey: "roleFounding",
		bioKey: "bioKellen",
		linkedin: "https://www.linkedin.com/in/kellen-snider-683396256/",
	},
] as const;

export const metadata: Metadata = {
	title: "About - TrustLedger",
	description:
		"Who builds TrustLedger, why it exists, and the escrow, arbitration, and reputation system behind it.",
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
			<section className="tl-about-hero tl-about-reveal relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-gray-950 sm:p-8">
				<div
					aria-hidden="true"
					className="tl-about-orb pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-gradient-to-br from-indigo-400/30 via-violet-400/20 to-transparent blur-2xl"
				/>
				<div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
					<div>
						<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
							{t("eyebrow")}
						</p>
						<h1 className="mt-3 bg-gradient-to-br from-gray-950 to-gray-600 bg-clip-text text-4xl font-bold tracking-[-0.025em] text-transparent dark:from-white dark:to-gray-400 sm:text-5xl">
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
				</div>
			</section>

			<section
				className="tl-about-reveal relative mt-8 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 dark:border-indigo-400/20 dark:from-indigo-500/10 dark:via-gray-950 dark:to-violet-500/10 sm:p-8"
				style={{ animationDelay: "0.08s" }}
			>
				<h2 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
					{t("originTitle")}
				</h2>
				<p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 dark:text-gray-200">
					{t("originBody")}
				</p>
				<p className="mt-4 max-w-3xl text-sm leading-7 text-gray-700 dark:text-gray-200">
					{t("originOrigin")}
				</p>
			</section>

			<section className="mt-10">
				<h2 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
					{t("capabilitiesTitle")}
				</h2>
				<div className="mt-4 grid gap-4 md:grid-cols-3">
					{cards.map(({ title, body }, index) => (
						<article
							key={title}
							className="tl-about-reveal tl-founder-card rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5"
							style={{ animationDelay: `${String(0.1 + index * 0.06)}s` }}
						>
							<span
								aria-hidden="true"
								className="block h-1 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
							/>
							<h3 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">
								{title}
							</h3>
							<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
								{body}
							</p>
						</article>
					))}
				</div>
			</section>

			<section className="mt-10">
				<h2 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
					{t("teamTitle")}
				</h2>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("teamIntro")}
				</p>
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					{FOUNDERS.map((founder, index) => (
						<article
							key={founder.name}
							className="tl-about-reveal tl-founder-card flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950"
							style={{ animationDelay: `${String(0.12 + index * 0.08)}s` }}
						>
							<div className="flex items-center gap-4">
								<span
									aria-hidden="true"
									className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white"
								>
									{founder.initials}
								</span>
								<div className="min-w-0">
									<p className="text-base font-semibold text-gray-950 dark:text-white">
										{founder.name}
									</p>
									<p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
										{t(founder.roleKey)}
									</p>
								</div>
							</div>
							<p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
								{t("orgLine")}
							</p>
							<p className="mt-3 flex-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
								{t(founder.bioKey)}
							</p>
							<a
								href={founder.linkedin}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={t("linkedinLabel", { name: founder.name })}
								className="tl-button-motion mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-indigo-400/40 dark:hover:text-indigo-300"
							>
								<svg
									aria-hidden="true"
									viewBox="0 0 24 24"
									width="16"
									height="16"
									fill="currentColor"
								>
									<path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21H9z" />
								</svg>
								LinkedIn
							</a>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
