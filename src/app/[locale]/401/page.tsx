import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { UnauthorizedContent } from "@/components/UnauthorizedContent";
import { routing } from "@/i18n/routing";

/** Pre-render the 401 page for every supported locale. */
export function generateStaticParams(): { locale: string }[] {
	return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "Unauthorized" });
	return {
		title: t("metadataTitle"),
		description: t("body"),
		robots: { index: false, follow: false },
	};
}

/** 401 "unauthorized" page featuring the Cow 401 scene. */
export default async function UnauthorizedPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);
	return <UnauthorizedContent />;
}
