import type { MetadataRoute } from "next";

/**
 * Absolute site origin, resolved identically to the sitemap and locale layout
 * so the advertised `sitemap` URL always matches the deployment.
 */
const siteOrigin =
	process.env.NEXT_PUBLIC_SITE_URL ??
	process.env.NEXT_PUBLIC_APP_URL ??
	"https://trustledger.vercel.app";

/**
 * Generates `/robots.txt`. Allows general crawling but excludes user- and
 * admin-specific surfaces that carry no SEO value, and points crawlers at the
 * generated sitemap.
 */
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/api/", "/*/account", "/*/admin", "/*/arbitration/"],
		},
		sitemap: `${siteOrigin}/sitemap.xml`,
	};
}
