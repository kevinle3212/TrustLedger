/**
 * Locale-aware root shell. Provides the `<html lang>` and `<dir>` attributes,
 * wraps with app Providers and Navbar, and makes
 * next-intl messages available to Client Components via NextIntlClientProvider.
 */
import dynamic from "next/dynamic";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PrivacyAnalytics } from "@/components/PrivacyAnalytics";
import { CookieConsent } from "@/components/CookieConsent";
import "../globals.scss";

const ReactScanMonitor =
	process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN === "true"
		? dynamic(async () => {
				const m = await import("../../components/ReactScanMonitor");
				return { default: m.ReactScanMonitor };
			})
		: null;

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	// Extend the layout under iOS notches/home indicator so backgrounds reach the
	// screen edges; the `tl-safe-*` utilities pad content back inside the safe area.
	viewportFit: "cover",
};

// Absolute origin for canonical/OG/icon URLs. Safari resolves the favicon
// against this base, so an absolute href avoids serving the Vercel deployment
// default. Mirrors the wallet `appUrl` resolution (site URL, then app URL).
const siteOrigin =
	process.env.NEXT_PUBLIC_SITE_URL ??
	process.env.NEXT_PUBLIC_APP_URL ??
	"https://trustledger.vercel.app";

const siteTitle = "TrustLedger - Decentralized Freelance Escrow";
const siteDescription =
	"Create trustless freelance contracts on Ethereum Sepolia. Funds held in escrow, released on approval or arbitration.";

/**
 * Per-locale document metadata. Builds the canonical URL and `hreflang`
 * alternates for the active locale (strong SEO signals), and supplies
 * OpenGraph/Twitter tags for rich link previews. The Safari-friendly icon set
 * is preserved so the project mark is used instead of the deployment default.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const canonical = `${siteOrigin}/${locale}`;
	const languages = Object.fromEntries(
		routing.locales.map((supported) => [supported, `${siteOrigin}/${supported}`]),
	);

	return {
		metadataBase: new URL(siteOrigin),
		title: siteTitle,
		description: siteDescription,
		applicationName: "TrustLedger",
		alternates: { canonical, languages },
		openGraph: {
			type: "website",
			siteName: "TrustLedger",
			title: siteTitle,
			description: siteDescription,
			url: canonical,
			locale,
			images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "TrustLedger" }],
		},
		twitter: {
			card: "summary",
			title: siteTitle,
			description: siteDescription,
			images: ["/icon-512.png"],
		},
		icons: {
			// Explicit, Safari-friendly icon set so the project mark is used instead
			// of the Vercel deployment default. `favicon.ico` is listed first for
			// Safari tabs (multi-size raster); `icon.svg` covers SVG-capable browsers.
			icon: [
				{ url: "/favicon.ico", sizes: "any" },
				{ url: "/icon.svg", type: "image/svg+xml" },
			],
			shortcut: "/favicon.ico",
			// 180×180 PNG: Safari rejects SVG and oversized images for the home-screen
			// touch icon, so this replaces the 1254×1254 logo.png that Safari ignored.
			apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
			// Safari pinned-tab / Touch Bar monochrome glyph. Safari flattens the SVG
			// to a single-color silhouette, so this points at a dedicated monochrome
			// shape rather than the multi-fill `icon.svg`.
			other: [{ rel: "mask-icon", url: "/mask-icon.svg", color: "#4f46e5" }],
		},
	};
}

/** Generate static params for all supported locales. */
export function generateStaticParams(): { locale: string }[] {
	return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;

	// Validate that the incoming locale is supported.
	if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
		notFound();
	}

	// Enable static rendering for this locale.
	setRequestLocale(locale);

	// Load locale resources in parallel so layout rendering is not serialized.
	const [messages, t] = await Promise.all([getMessages(), getTranslations("Nav")]);

	const dir = locale === "ar" ? "rtl" : "ltr";

	return (
		<html lang={locale} dir={dir} className="h-full antialiased" suppressHydrationWarning>
			<body
				className="tl-surface-page tl-safe-x min-h-full flex flex-col"
				suppressHydrationWarning
			>
				<NextIntlClientProvider messages={messages}>
					<a href="#main-content" className="skip-link">
						{t("skipToMain")}
					</a>
					<Providers>
						<Navbar />
						<main id="main-content" className="flex-1">
							{children}
						</main>
						<Footer />
					</Providers>
					<PrivacyAnalytics />
					<CookieConsent />
					{ReactScanMonitor !== null && <ReactScanMonitor />}
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
