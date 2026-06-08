"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

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

/** Button that toggles between light and dark mode. */
export function ThemeToggle(): React.JSX.Element {
	const { resolvedTheme, setTheme } = useTheme();
	const t = useTranslations("Common");

	// resolvedTheme is undefined on the server and on the first client render
	// (before next-themes mounts), so both render this same-size placeholder -
	// keeping markup identical across hydration (avoids React #418) without a
	// setState-in-effect mounted flag.
	if (resolvedTheme === undefined) return <div className="h-10 w-10 sm:h-9 sm:w-9" />;

	const isDark = resolvedTheme === "dark";

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
