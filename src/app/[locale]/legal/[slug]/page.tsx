import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { MarkdownContent } from "@/content/MarkdownContent";
import { loadContentMarkdown } from "@/content/loader";
import { CONTENT_COLLECTIONS, getContentDocument } from "@/content/registry";
import { Link } from "@/i18n/navigation";
import {
	formatLegalLocaleDisplay,
	getLegalDocumentBySlug,
	LEGAL_DOCUMENTS,
	resolveLegalLocale,
} from "@/helpers/legal-docs";

interface LegalDocPageParams {
	locale: string;
	slug: string;
}

export function generateStaticParams(): LegalDocPageParams[] {
	return LEGAL_DOCUMENTS.flatMap((document) =>
		["en", "es", "vi", "pt", "zh-CN", "ar", "fr", "hi"].map((locale) => ({
			locale,
			slug: document.slug,
		})),
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<LegalDocPageParams>;
}): Promise<Metadata> {
	const { locale, slug } = await params;
	const t = await getTranslations({ locale, namespace: "Legal" });
	const document = getLegalDocumentBySlug(slug);
	if (document === undefined) {
		return { title: t("metadata.notFoundTitle") };
	}

	return {
		title: t("metadata.documentTitle", { title: t(`documents.${document.slug}.title`) }),
		description: t(`documents.${document.slug}.description`),
	};
}

export default async function LegalDocumentPage({
	params,
}: {
	params: Promise<LegalDocPageParams>;
}): Promise<React.JSX.Element> {
	const { locale, slug } = await params;
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "Legal" });

	const document = getLegalDocumentBySlug(slug);
	const source = getContentDocument(CONTENT_COLLECTIONS.legal, slug);
	if (document === undefined || source === undefined) notFound();

	const legalLocale = resolveLegalLocale(locale);
	const legalLocaleDisplay = formatLegalLocaleDisplay(legalLocale);
	const markdown = await loadContentMarkdown(CONTENT_COLLECTIONS.legal, source.file, legalLocale);

	return (
		<main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
			<Link
				href="/legal"
				className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
			>
				{t("document.back")}
			</Link>

			<header className="mt-8 max-w-3xl">
				<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
					{t("eyebrow")}
				</p>
				<h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
					{t(`documents.${document.slug}.title`)}
				</h1>
				<p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-300">
					{t(`documents.${document.slug}.description`)}
				</p>
				<p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
					{t("document.sourceFile")}{" "}
					<span className="font-mono">{document.sourceFile}</span>. {t("document.locale")}{" "}
					<span className="font-semibold">{legalLocaleDisplay}</span>.
				</p>
			</header>

			<article className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-950 sm:p-8">
				<MarkdownContent markdown={markdown} />
			</article>
		</main>
	);
}
