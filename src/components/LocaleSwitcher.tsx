"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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

function focusLocaleOption(nextIndex: number): void {
	const boundedIndex = (nextIndex + routing.locales.length) % routing.locales.length;
	const nextLocale = routing.locales[boundedIndex];
	if (nextLocale === undefined) return;
	document.getElementById(`locale-option-${nextLocale}`)?.focus();
}

/** Dropdown for switching the active locale; updates the URL prefix via `next-intl`. */
export function LocaleSwitcher(): React.JSX.Element {
	const locale = useLocale() as (typeof routing.locales)[number];
	const router = useRouter();
	const t = useTranslations("Nav");
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const selectedLabel = LOCALE_LABELS[locale];

	useEffect(() => {
		function closeOnOutsideClick(event: MouseEvent): void {
			if (
				rootRef.current !== null &&
				event.target instanceof Node &&
				!rootRef.current.contains(event.target)
			) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", closeOnOutsideClick);
		return (): void => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
		};
	}, []);

	function switchLocale(nextLocale: (typeof routing.locales)[number]): void {
		const pathSegments = window.location.pathname.split("/").filter(Boolean);
		const [, ...rest] = hasLocaleSegment(pathSegments) ? pathSegments : ["", ...pathSegments];
		const pathname = rest.length > 0 ? `/${rest.join("/")}` : "/";
		setOpen(false);
		router.replace(pathname, { locale: nextLocale });
	}

	return (
		<div ref={rootRef} className="locale-switcher">
			<label className="sr-only" id="locale-switcher-label">
				{t("changeLanguage")}
			</label>
			<button
				id="locale-switcher"
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-labelledby="locale-switcher-label locale-switcher-current"
				className="locale-switcher__button"
				onClick={() => {
					setOpen((value) => !value);
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						setOpen(false);
						return;
					}
					if (event.key === "ArrowDown" || event.key === "ArrowUp") {
						event.preventDefault();
						setOpen(true);
						const currentIndex = routing.locales.indexOf(locale);
						focusLocaleOption(currentIndex + (event.key === "ArrowDown" ? 1 : -1));
					}
				}}
			>
				<span className="locale-switcher__icon">
					<GlobeIcon />
				</span>
				<span id="locale-switcher-current" className="locale-switcher__current">
					{selectedLabel}
				</span>
				<span className="locale-switcher__chevron">
					<ChevronIcon />
				</span>
			</button>
			{open && (
				<ul aria-labelledby="locale-switcher-label" className="locale-switcher__menu">
					{routing.locales.map((option, index) => {
						const selected = option === locale;
						return (
							<li key={option}>
								<button
									id={`locale-option-${option}`}
									type="button"
									aria-current={selected ? "true" : undefined}
									tabIndex={selected ? 0 : -1}
									className="locale-switcher__option"
									onClick={() => {
										switchLocale(option);
									}}
									onKeyDown={(event) => {
										if (event.key === "Escape") {
											setOpen(false);
											document.getElementById("locale-switcher")?.focus();
										}
										if (event.key === "ArrowDown" || event.key === "ArrowUp") {
											event.preventDefault();
											focusLocaleOption(
												index + (event.key === "ArrowDown" ? 1 : -1),
											);
										}
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											switchLocale(option);
										}
									}}
								>
									<span>{LOCALE_LABELS[option]}</span>
									<span className="locale-switcher__check" aria-hidden="true">
										{selected ? "✓" : ""}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function hasLocaleSegment(pathSegments: string[]): boolean {
	return routing.locales.includes(pathSegments[0] as (typeof routing.locales)[number]);
}
