import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
	title: "Legal Center - TrustLedger",
	description:
		"TrustLedger legal, policy, compliance, risk disclosure, and security document index.",
};

const legalDocuments = [
	{
		title: "Terms and Conditions",
		description:
			"User obligations, platform scope, wallet activity, escrow actions, and dispute handling.",
	},
	{
		title: "Privacy Policy",
		description:
			"Personal data handling, wallet identifiers, operational logs, analytics, and user rights.",
	},
	{
		title: "Cookie Policy",
		description: "Browser storage, cookies, analytics preferences, and consent expectations.",
	},
	{
		title: "Acceptable Use Policy",
		description:
			"Prohibited activity, sanctions-sensitive conduct, abuse controls, and enforcement paths.",
	},
	{
		title: "Content Policy",
		description:
			"Rules for contract links, deliverables, evidence uploads, and platform-visible materials.",
	},
	{
		title: "DMCA Policy",
		description:
			"Copyright takedown notices, counter-notices, repeat infringer handling, and agent details.",
	},
	{
		title: "Trademark Policy",
		description: "Brand use, impersonation, confusing marks, and reporting requirements.",
	},
	{
		title: "Risk Disclosure",
		description:
			"Blockchain, wallet, smart contract, market, arbitration, and availability risks.",
	},
	{
		title: "Disclaimer",
		description:
			"No legal, financial, tax, or investment advice and no guarantee of dispute outcomes.",
	},
	{
		title: "Community Guidelines",
		description:
			"Professional conduct, evidence quality, juror behavior, and communication standards.",
	},
	{
		title: "Security Policy",
		description:
			"Responsible disclosure, supported security scope, and vulnerability reporting.",
	},
];

export default async function LegalPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);

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
					This page is the formal publication index for TrustLedger legal documents. Draft
					legal files remain under owner review until explicitly approved for publication.
				</p>
			</section>

			<section className="grid gap-4 md:grid-cols-2">
				{legalDocuments.map((document) => (
					<article
						key={document.title}
						className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-950"
					>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							{document.title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{document.description}
						</p>
						<p className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
							Pending owner review
						</p>
					</article>
				))}
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
