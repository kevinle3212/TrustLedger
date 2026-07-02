import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/**
 * This route always 404s, so keep it out of search indexes. The not-found
 * boundary that renders in its place also sets `robots: index=false`; this
 * declaration keeps the catch-all itself noindex for any crawler that resolves
 * metadata before the response status.
 */
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

/**
 * Catch-all for unmatched paths under a locale (e.g. `/en/does-not-exist`).
 *
 * Next.js only renders `app/[locale]/not-found.tsx` when `notFound()` is thrown
 * from inside the segment; an unmatched URL would otherwise fall through to the
 * root `app/not-found.tsx`, which lives outside the locale layout (no i18n
 * provider, no `globals.scss`) and so cannot show the animated Cow 404.
 * Throwing `notFound()` here routes every bad locale path to the branded,
 * localized Cow 404 boundary instead. Explicit routes (pages, 4xx/5xx) take
 * priority over this catch-all, so only genuinely unmatched paths reach it.
 */
export default async function LocaleCatchAll({
	params,
}: {
	params: Promise<{ locale: string; rest: string[] }>;
}): Promise<never> {
	const { locale } = await params;
	setRequestLocale(locale);
	notFound();
}
