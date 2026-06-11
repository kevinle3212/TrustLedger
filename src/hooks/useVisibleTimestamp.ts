"use client";

import { useEffect, useState } from "react";

function isDocumentVisible(): boolean {
	return typeof document === "undefined" || document.visibilityState === "visible";
}

/**
 * Returns Date.now() on an interval only while the page is visible. This keeps
 * clocks accurate for visible UI without waking hidden mobile tabs.
 */
export function useVisibleTimestamp(intervalMs: number): number {
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		let interval: number | null = null;

		const stop = (): void => {
			if (interval === null) return;
			window.clearInterval(interval);
			interval = null;
		};

		const start = (): void => {
			stop();
			setNowMs(Date.now());
			interval = window.setInterval(() => {
				setNowMs(Date.now());
			}, intervalMs);
		};

		const handleVisibilityChange = (): void => {
			if (isDocumentVisible()) {
				start();
			} else {
				stop();
			}
		};

		if (isDocumentVisible()) start();
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return (): void => {
			stop();
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [intervalMs]);

	return nowMs;
}
