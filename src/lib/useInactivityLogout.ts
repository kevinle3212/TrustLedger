"use client";

import { useEffect, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";

/**
 * Minutes of user inactivity after which a connected wallet is automatically
 * disconnected. Exported so tests/dev can reference the same constant.
 */
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

// Activity within this window of the previous reset is ignored, so a burst of
// mousemove/scroll events doesn't reschedule the timer hundreds of times.
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

/**
 * Auto-logs-out (wagmi `disconnect`) after {@link INACTIVITY_LIMIT_MS} of no
 * user interaction while a wallet is connected. Any pointer/keyboard/touch
 * activity, or the tab becoming visible again, resets the countdown.
 *
 * This only tears down the local wallet connection; it stores no auth state and
 * a subsequent reconnect re-prompts the wallet. Mount it once, app-wide, inside
 * the wagmi provider (see `components/Providers.tsx`).
 */
export function useInactivityLogout(): void {
	const { isConnected } = useAccount();
	const { disconnect } = useDisconnect();
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastResetRef = useRef<number>(0);

	// react-doctor-disable-next-line react-doctor/exhaustive-deps
	// timerRef.current in cleanup is intentional: we want to clear whatever
	// timer is live at teardown time. Refs are stable and do not belong in deps.
	useEffect(() => {
		if (!isConnected) return;

		const reset = (): void => {
			if (timerRef.current !== null) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				disconnect();
			}, INACTIVITY_LIMIT_MS);
		};

		const onActivity = (): void => {
			const now = Date.now();
			if (now - lastResetRef.current < ACTIVITY_THROTTLE_MS) return;
			lastResetRef.current = now;
			reset();
		};

		const onVisibility = (): void => {
			if (document.visibilityState === "visible") onActivity();
		};

		for (const event of ACTIVITY_EVENTS) {
			window.addEventListener(event, onActivity, { passive: true });
		}
		document.addEventListener("visibilitychange", onVisibility);

		// Start the countdown immediately on connect.
		reset();

		return (): void => {
			for (const event of ACTIVITY_EVENTS) {
				window.removeEventListener(event, onActivity);
			}
			document.removeEventListener("visibilitychange", onVisibility);
			if (timerRef.current !== null) clearTimeout(timerRef.current);
		};
	}, [isConnected, disconnect]);
}
