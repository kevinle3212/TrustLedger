"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
	"en": "English",
	"es": "Español",
	"vi": "Tiếng Việt",
	"pt": "Português",
	"zh-CN": "简体中文",
	"ar": "العربية",
	"fr": "Français",
	"hi": "हिन्दी",
};

function GlobeIcon(): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className="h-4 w-4"
		>
			<path
				d="M10 17.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<path
				d="M2.5 10h15M10 2.5c1.8 2 2.75 4.36 2.75 7.5S11.8 15.5 10 17.5C8.2 15.5 7.25 12.64 7.25 10S8.2 4.5 10 2.5Z"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function ChevronIcon(): React.JSX.Element {
	return (
		<svg
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			className="h-4 w-4"
		>
			<path
				d="m5 7.5 5 5 5-5"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function LocaleSwitcher(): React.JSX.Element {
	const locale = useLocale() as (typeof routing.locales)[number];
	const pathname = usePathname();
	const router = useRouter();
	const t = useTranslations("Nav");

	return (
		<div className="locale-switcher">
			<GlobeIcon />
			<label className="sr-only" htmlFor="locale-switcher">
				{t("changeLanguage")}
			</label>
			<select
				id="locale-switcher"
				value={locale}
				onChange={(event) => {
					const nextLocale = event.target.value as (typeof routing.locales)[number];
					router.replace(pathname, { locale: nextLocale });
				}}
				aria-label={t("changeLanguage")}
				className="locale-switcher__select"
			>
				{routing.locales.map((option) => (
					<option key={option} value={option}>
						{LOCALE_LABELS[option]}
					</option>
				))}
			</select>
			<span className="locale-switcher__chevron">
				<ChevronIcon />
			</span>
		</div>
	);
}
