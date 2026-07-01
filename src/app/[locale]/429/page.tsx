import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ErrorStateContent } from "@/components/ErrorStateContent";
import { routing } from "@/i18n/routing";

/** Pre-render the 429 page for every supported locale. */
export function generateStaticParams(): { locale: string }[] {
	return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "ErrorPages" });
	return {
		title: t("codes.429.metadataTitle"),
		description: t("codes.429.body"),
		robots: { index: false, follow: false },
	};
}

/** Branded 429 HTTP error page built on the shared animated error scene. */
export default async function HttpError429Page({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);
	return <ErrorStateContent status={429} />;
}
