"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Returns the user to the previous entry in the browser history, falling back to
 * the locale-aware home route when there is no in-app history to step back to
 * (for example, a branded error page opened directly from a bookmark or a fresh
 * tab). Rendered as a secondary action on the error pages.
 */
export function GoBackButton({ label }: { label: string }): React.JSX.Element {
	const router = useRouter();

	const handleClick = useCallback(() => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			router.back();
			return;
		}
		router.push("/");
	}, [router]);

	return (
		<button
			type="button"
			onClick={handleClick}
			className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
		>
			{label}
		</button>
	);
}
