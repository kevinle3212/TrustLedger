"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

function SunIcon(): React.JSX.Element {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
		</svg>
	);
}

function MoonIcon(): React.JSX.Element {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	);
}

// Hydration-safe "are we on the client yet?" flag. useSyncExternalStore returns
// false during SSR and the first client render, then true after hydration.
const subscribeNoop = (): (() => void) => (): void => undefined;
function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		() => true,
		() => false,
	);
}

/** Button that toggles between light and dark mode. */
export function ThemeToggle(): React.JSX.Element {
	const { resolvedTheme, setTheme } = useTheme();
	const t = useTranslations("Common");
	const mounted = useMounted();

	// next-themes can resolve the active theme before React hydrates this client
	// component, so the first client render must stay identical to the server
	// placeholder. After mount, it is safe to show the real interactive button.
	if (!mounted) return <div className="h-10 w-10 sm:h-9 sm:w-9" />;

	const isDark = (resolvedTheme ?? "dark") === "dark";

	return (
		<button
			type="button"
			onClick={() => {
				setTheme(isDark ? "light" : "dark");
			}}
			aria-label={isDark ? t("switchToLightMode") : t("switchToDarkMode")}
			className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white sm:min-h-9 sm:min-w-9"
		>
			{isDark ? <SunIcon /> : <MoonIcon />}
		</button>
	);
}
