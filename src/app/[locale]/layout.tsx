/**
 * Locale-aware root shell. Provides the `<html lang>` and `<dir>` attributes,
 * wraps with app Providers and Navbar, and makes
 * next-intl messages available to Client Components via NextIntlClientProvider.
 */
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "../globals.scss";

const ReactScanMonitor =
	process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_REACT_SCAN === "true"
		? dynamic(async () => {
				const m = await import("../../components/ReactScanMonitor");
				return { default: m.ReactScanMonitor };
			})
		: null;

export const metadata: Metadata = {
	title: "TrustLedger - Decentralized Freelance Escrow",
	description:
		"Create trustless freelance contracts on Ethereum Sepolia. Funds held in escrow, released on approval or arbitration.",
};

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
			<body className="tl-surface-page min-h-full flex flex-col" suppressHydrationWarning>
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
					{ReactScanMonitor !== null && <ReactScanMonitor />}
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
