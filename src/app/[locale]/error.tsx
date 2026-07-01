"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { GoBackButton } from "@/components/GoBackButton";
import { ErrorScene } from "@/components/ErrorStateContent";

/**
 * Locale-scoped error boundary for the App Router. Catches uncaught runtime
 * errors thrown while rendering any route under `[locale]` and replaces the
 * Vercel/Next default with the branded fault scene. Rendered inside the locale
 * layout, so `NextIntlClientProvider` is available and copy stays localized.
 *
 * Offers a `Try Again` action (re-runs the failed render via `reset`) alongside
 * the standard Go Home / Go Back recovery links.
 *
 * @param error - The thrown error (with an optional digest) surfaced by Next.js.
 * @param reset - Re-attempts rendering the errored segment.
 */
export default function LocaleError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}): React.JSX.Element {
	const t = useTranslations("ErrorPages");

	useEffect(() => {
		// Surface the failure for diagnostics without exposing details to the user.
		console.error("[TrustLedger] route error boundary:", error);
	}, [error]);

	return (
		<section className="tl-site-frame flex min-h-[70vh] items-center py-12">
			<div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						{t("codes.generic.eyebrow")}
					</p>
					<h1 className="mt-3 text-5xl font-bold tracking-[-0.03em] text-gray-950 sm:text-6xl dark:text-white">
						{t("codes.generic.title")}
					</h1>
					<p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
						{t("codes.generic.body")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<button
							type="button"
							onClick={reset}
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("tryAgain")}
						</button>
						<Link
							href="/"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("goHome")}
						</Link>
						<GoBackButton label={t("goBack")} />
					</div>
				</div>
				<div className="mx-auto flex w-full max-w-80 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
					<ErrorScene />
				</div>
			</div>
		</section>
	);
}
