"use client";

import { useTranslations } from "next-intl";

import { OPEN_PREFERENCES_EVENT } from "@/lib/cookie-consent";

/** Cog-style glyph for the footer cookie preferences control. */
function CookieFooterIcon(): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="size-4"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<circle cx="10" cy="10" r="7.5" />
			<circle cx="7.5" cy="8" r="0.6" fill="currentColor" />
			<circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
			<circle cx="8" cy="13" r="0.6" fill="currentColor" />
			<circle cx="13" cy="12" r="0.6" fill="currentColor" />
		</svg>
	);
}

/**
 * Footer control that re-opens the cookie preferences dialog. Lets users
 * withdraw or change consent at any time (GDPR Art. 7(3) / CPRA), satisfying
 * the "always available" requirement for consent management.
 */
export function CookiePreferencesButton(): React.JSX.Element {
	const t = useTranslations("Footer");

	return (
		<button
			type="button"
			onClick={() => {
				window.dispatchEvent(new CustomEvent(OPEN_PREFERENCES_EVENT));
			}}
			className="tl-button-motion inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white sm:w-auto"
			aria-label={t("openCookiePreferences")}
		>
			<CookieFooterIcon />
			<span>{t("cookiePreferences")}</span>
		</button>
	);
}
