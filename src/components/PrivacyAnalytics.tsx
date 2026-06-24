"use client";

import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";

const enabled = process.env["NEXT_PUBLIC_PRIVACY_ANALYTICS_ENABLED"] === "true";

function privacyOptOut(): boolean {
	const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
	return navigator.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function sendAnalytics(name: "page_view" | "frontend_error", path: string, locale: string): void {
	if (!enabled || privacyOptOut()) return;
	const payload = JSON.stringify({ name, path, locale });
	const body = new Blob([payload], { type: "application/json" });
	if (navigator.sendBeacon("/api/analytics/events", body)) return;
	void fetch("/api/analytics/events", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: payload,
		keepalive: true,
	}).catch((): undefined => undefined);
}

/** Client-side analytics beacon that fires a `page_view` event on route changes. Renders nothing. */
export function PrivacyAnalytics(): null {
	const pathname = usePathname();
	const locale = useLocale();

	useEffect(() => {
		sendAnalytics("page_view", pathname, locale);
	}, [locale, pathname]);

	useEffect(() => {
		function handleError(): void {
			sendAnalytics("frontend_error", pathname, locale);
		}
		window.addEventListener("error", handleError);
		window.addEventListener("unhandledrejection", handleError);
		return (): void => {
			window.removeEventListener("error", handleError);
			window.removeEventListener("unhandledrejection", handleError);
		};
	}, [locale, pathname]);

	return null;
}
