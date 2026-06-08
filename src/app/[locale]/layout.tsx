/**
 * Locale-aware root shell. Provides the `<html lang>` and `<dir>` attributes,
 * loads Geist fonts, wraps with app Providers and Navbar, and makes
 * next-intl messages available to Client Components via NextIntlClientProvider.
 */
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import "../globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const ReactScanMonitor =
	process.env.NODE_ENV === "development"
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

	// Load messages for the current locale so they can be passed to Client Components.
	const messages = await getMessages();
	const t = await getTranslations("Nav");

	const dir = locale === "ar" ? "rtl" : "ltr";

	return (
		<html
			lang={locale}
			dir={dir}
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body
				className="min-h-full flex flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100"
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
					</Providers>
					{ReactScanMonitor !== null && <ReactScanMonitor />}
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
