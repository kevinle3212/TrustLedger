"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tl-high-contrast";
const HC_CLASS = "high-contrast";

/** Apply initial preference synchronously before first paint (called once). */
function applyInitialContrast(): void {
	const stored = localStorage.getItem(STORAGE_KEY);
	const initial =
		stored !== null ? stored === "true" : window.matchMedia("(prefers-contrast: more)").matches;
	document.documentElement.classList.toggle(HC_CLASS, initial);
}

let initialised = false;

/** Subscribe to changes to the `high-contrast` class on `<html>`. */
function subscribe(cb: () => void): () => void {
	if (!initialised) {
		applyInitialContrast();
		initialised = true;
	}
	const observer = new MutationObserver(cb);
	observer.observe(document.documentElement, { attributeFilter: ["class"] });
	return () => {
		observer.disconnect();
	};
}

function getSnapshot(): boolean {
	return document.documentElement.classList.contains(HC_CLASS);
}

function getServerSnapshot(): boolean {
	return false;
}

/**
 * Toggles high-contrast mode by adding/removing the `high-contrast` class on
 * `<html>`. The preference is persisted in `localStorage` and initialised from
 * the `prefers-contrast: more` media query when no preference is stored.
 */
export function ContrastToggle(): React.JSX.Element {
	const high = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	const t = useTranslations("Common");

	function toggle(): void {
		const next = !high;
		document.documentElement.classList.toggle(HC_CLASS, next);
		localStorage.setItem(STORAGE_KEY, String(next));
	}

	return (
		<button
			type="button"
			onClick={toggle}
			aria-pressed={high}
			aria-label={high ? t("disableHighContrast") : t("enableHighContrast")}
			title={high ? t("highContrastOn") : t("highContrastOff")}
			className="tl-button-motion inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white sm:min-h-9 sm:min-w-9"
		>
			{/* Half-filled circle signals contrast adjustment */}
			<svg
				aria-hidden="true"
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="10" cy="10" r="8" />
				<path d="M10 2 A8 8 0 0 1 10 18 Z" fill="currentColor" stroke="none" />
			</svg>
		</button>
	);
}
