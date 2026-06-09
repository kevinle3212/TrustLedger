import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

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
	const legalLocale = resolveLegalLocale(locale);
	const translationStatus = getLegalTranslationStatus(locale);

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 sm:py-16">
			<section className="max-w-3xl">
				<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
					TrustLedger Legal Center
				</p>
				<h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
					Policies, disclosures, and compliance references
				</h1>
				<p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-300">
					This page is the formal publication index for TrustLedger legal documents. Legal
					content is maintained in Markdown and can be translated with a human-review
					workflow before publication.
				</p>
				<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
					Current locale: <span className="font-semibold">{legalLocale}</span>.
					Translation status: <span className="font-semibold">{translationStatus}</span>.
				</p>
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				{LEGAL_DOCUMENTS.map((document) => (
					<article
						key={document.title}
						className="tl-motion-card rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950"
					>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							{document.title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{document.description}
						</p>
						<p className="mt-3 font-mono text-xs text-gray-500 dark:text-gray-400">
							{document.sourceFile}
						</p>
						<p className="mt-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200">
							{document.translationStatus}
						</p>
						<Link
							href={`/legal/${document.slug}`}
							className="tl-button-motion mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							View document
						</Link>
					</article>
				))}
			</section>

			<section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
				<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
					Translation helper
				</h2>
				<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
					Legal translations should preserve legal numbering, defined terms, links, and
					markdown structure. Machine-assisted drafts must remain marked for review until
					approved by a qualified reviewer.
				</p>
				<code className="mt-4 block overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
					{buildLegalTranslationPrompt(LEGAL_DOCUMENTS[0], legalLocale)}
				</code>
			</section>

			<section className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
				<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
					Security and reporting
				</h2>
				<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
					Security disclosures remain routed through the repository security policy. Legal
					content changes should be reviewed before publication and mirrored into
					documentation.
				</p>
				<div className="mt-4 flex flex-col gap-3 sm:flex-row">
					<a
						href="https://github.com/kevinle3212/TrustLedger/blob/main/SECURITY.md"
						target="_blank"
						rel="noopener noreferrer"
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						View security policy
					</a>
					<Link
						href="/faq"
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
					>
						Read FAQ
					</Link>
				</div>
			</section>
		</div>
	);
}
