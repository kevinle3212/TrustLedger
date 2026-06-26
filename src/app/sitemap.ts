import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";

/**
 * Absolute site origin used to build canonical sitemap URLs. Mirrors the
 * resolution in the locale layout (site URL, then app URL, then the production
 * default) so canonical, OpenGraph, and sitemap origins always agree.
 */
const siteOrigin =
	process.env.NEXT_PUBLIC_SITE_URL ??
	process.env.NEXT_PUBLIC_APP_URL ??
	"https://trustledger.vercel.app";

/**
 * Public, indexable routes (locale-relative). Wallet-gated pages such as the
 * dashboard are included because their URLs are publicly reachable and render a
 * meaningful connect prompt; user-, admin-, and id-specific routes are omitted.
 */
const PUBLIC_ROUTES = [
	"",
	"/create",
	"/dashboard",
	"/juror",
	"/reputation",
	"/faq",
	"/about",
	"/legal",
	"/stats",
	"/analytics",
] as const;

/** Builds the absolute URL for a route in a given locale. */
function urlFor(locale: string, route: string): string {
	return `${siteOrigin}/${locale}${route}`;
}

/**
 * Generates `/sitemap.xml`. Each route is emitted once (under the default
 * locale) with `alternates.languages` hreflang entries for every supported
 * locale, so search engines discover all localized variants without duplicate
 * primary entries.
 */
export default function sitemap(): MetadataRoute.Sitemap {
	return PUBLIC_ROUTES.map((route) => ({
		url: urlFor(routing.defaultLocale, route),
		changeFrequency: "weekly",
		priority: route === "" ? 1 : 0.7,
		alternates: {
			languages: Object.fromEntries(
				routing.locales.map((locale) => [locale, urlFor(locale, route)]),
			),
		},
	}));
}
