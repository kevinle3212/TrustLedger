import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
	buildLegalTranslationPrompt,
	getLegalTranslationStatus,
	LEGAL_DOCUMENTS,
	resolveLegalLocale,
} from "@/helpers/legal-docs";

export const metadata: Metadata = {
	title: "Legal Center - TrustLedger",
	description:
		"TrustLedger legal, policy, compliance, risk disclosure, and security document index.",
};

export default async function LegalPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "Legal" });
	const legalLocale = resolveLegalLocale(locale);
	const translationStatus = getLegalTranslationStatus(locale);

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 sm:py-16">
			<section className="max-w-3xl">
				<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
					{t("eyebrow")}
				</p>
				<h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
					{t("title")}
				</h1>
				<p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-300">
					{t("intro")}
				</p>
				<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("currentLocale")} <span className="font-semibold">{legalLocale}</span>.{" "}
					{t("translationStatus")}{" "}
					<span className="font-semibold">{t(`status.${translationStatus}`)}</span>
				</p>
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				{LEGAL_DOCUMENTS.map((document) => (
					<article
						key={document.title}
						className="tl-motion-card flex min-h-64 flex-col rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950"
					>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							{t(`documents.${document.slug}.title`)}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{t(`documents.${document.slug}.description`)}
						</p>
						<div className="mt-auto pt-5">
							<div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
								<div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-400/25 dark:bg-sky-400/10">
									<p className="flex items-center gap-2 text-xs font-semibold text-sky-800 dark:text-sky-100">
										<span
											className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[0.7rem] font-bold text-sky-700 shadow-sm dark:bg-gray-950 dark:text-sky-200"
											aria-hidden="true"
										>
											SF
										</span>
										{t("sourceFile")}
									</p>
									<p className="mt-2 min-w-0 break-all font-mono text-xs text-gray-700 dark:text-gray-200">
										{document.sourceFile}
									</p>
								</div>
								<p className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
									{t(`status.${document.translationStatus}`)}
								</p>
							</div>
							<Link
								href={`/legal/${document.slug}`}
								className="tl-button-motion mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-sky-600 dark:text-white dark:hover:bg-sky-500"
							>
								{t("viewDocument")}
							</Link>
						</div>
					</article>
				))}
			</section>

			<section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
				<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
					{t("translationHelper.title")}
				</h2>
				<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("translationHelper.body")}
				</p>
				<ol className="mt-4 grid gap-2 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:grid-cols-3">
					<li className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
						{t("translationHelper.stepOne")}
					</li>
					<li className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
						{t("translationHelper.stepTwo")}
					</li>
					<li className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
						{t("translationHelper.stepThree")}
					</li>
				</ol>
				<code className="mt-4 block overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
					{buildLegalTranslationPrompt(LEGAL_DOCUMENTS[0], legalLocale)}
				</code>
			</section>

			<section className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
				<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
					{t("security.title")}
				</h2>
				<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("security.body")}
				</p>
				<div className="mt-4 flex flex-col gap-3 sm:flex-row">
					<a
						href="https://github.com/kevinle3212/TrustLedger/blob/main/SECURITY.md"
						target="_blank"
						rel="noopener noreferrer"
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						{t("security.viewPolicy")}
					</a>
					<Link
						href="/faq"
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
					>
						{t("security.readFaq")}
					</Link>
				</div>
			</section>
		</div>
	);
}
