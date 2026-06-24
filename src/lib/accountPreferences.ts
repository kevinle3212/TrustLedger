"use client";

import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

/** localStorage key storing the user's preferred inactivity timeout in milliseconds. */
const INACTIVITY_TIMEOUT_KEY = "trustledger:inactivity:timeout";

/** Default auto-logout timeout (10 minutes). */
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;

/** Available timeout options in milliseconds. */
export const INACTIVITY_TIMEOUT_OPTIONS = [
	{ ms: 1 * 60 * 1000, label: "1 Min" },
	{ ms: 5 * 60 * 1000, label: "5 Min" },
	{ ms: 10 * 60 * 1000, label: "10 Min" },
	{ ms: 15 * 60 * 1000, label: "15 Min" },
	{ ms: 30 * 60 * 1000, label: "30 Min" },
	{ ms: 60 * 60 * 1000, label: "1 Hr" },
] as const;

/** Reads the user's preferred inactivity timeout from localStorage. Falls back to the default. */
export function readInactivityTimeoutMs(): number {
	try {
		const raw = window.localStorage.getItem(INACTIVITY_TIMEOUT_KEY);
		if (raw !== null) {
			const ms = Number(raw);
			if (!Number.isNaN(ms) && ms > 0) return ms;
		}
	} catch {
		// localStorage unavailable.
	}
	return DEFAULT_INACTIVITY_TIMEOUT_MS;
}

/** Event dispatched after the inactivity timeout changes within the same tab. */
const INACTIVITY_TIMEOUT_EVENT = "trustledger:inactivity:timeout:change";

/** Persists the user's preferred inactivity timeout to localStorage. */
export function writeInactivityTimeoutMs(ms: number): void {
	try {
		window.localStorage.setItem(INACTIVITY_TIMEOUT_KEY, String(ms));
		window.dispatchEvent(new Event(INACTIVITY_TIMEOUT_EVENT));
	} catch {
		// localStorage unavailable.
	}
}

/**
 * Subscribes to inactivity-timeout changes for `useSyncExternalStore`. Fires on
 * same-tab writes (custom event) and cross-tab writes (`storage` event).
 *
 * @param onChange - Callback invoked when the stored value may have changed.
 * @returns An unsubscribe function.
 */
export function subscribeInactivityTimeout(onChange: () => void): () => void {
	window.addEventListener(INACTIVITY_TIMEOUT_EVENT, onChange);
	window.addEventListener("storage", onChange);
	return () => {
		window.removeEventListener(INACTIVITY_TIMEOUT_EVENT, onChange);
		window.removeEventListener("storage", onChange);
	};
}

const DASHBOARD_VISITED_KEY = "tl_visited";
const PROFILE_STORAGE_HANDLE = ["trustledger", "profile", "handle"].join(":");

/** Returns `true` if the user has completed the dashboard onboarding guide (local flag only). */
export function readLocalDashboardVisited(): boolean {
	try {
		return window.localStorage.getItem(DASHBOARD_VISITED_KEY) === "1";
	} catch {
		return false;
	}
}

function markLocalDashboardVisited(): void {
	try {
		window.localStorage.setItem(DASHBOARD_VISITED_KEY, "1");
	} catch {
		// Browser storage can be unavailable in private or sandboxed contexts.
	}
}

export async function readDashboardVisitedPreference(): Promise<boolean> {
	const localVisited = readLocalDashboardVisited();
	let token: string | null = null;
	try {
		token = window.localStorage.getItem(PROFILE_STORAGE_HANDLE);
	} catch {
		return localVisited;
	}
	if (token === null || token === "") return localVisited;

	try {
		const response = await fetchWithTimeout(
			"/api/accounts/profile",
			{
				headers: { authorization: `Bearer ${token}` },
			},
			REQUEST_TIMEOUT_MS.accountPreference,
		);
		if (!response.ok) return localVisited;
		const payload = (await response.json()) as {
			profile?: { onboardingComplete?: unknown };
		};
		return payload.profile?.onboardingComplete === true || localVisited;
	} catch {
		return localVisited;
	}
}

export async function markDashboardVisitedPreference(): Promise<void> {
	markLocalDashboardVisited();
	let token: string | null = null;
	try {
		token = window.localStorage.getItem(PROFILE_STORAGE_HANDLE);
	} catch {
		return;
	}
	if (token === null || token === "") return;
	try {
		await fetchWithTimeout(
			"/api/accounts/profile",
			{
				method: "PATCH",
				headers: {
					"authorization": `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ onboardingComplete: true }),
			},
			REQUEST_TIMEOUT_MS.accountPreference,
		);
	} catch {
		// Local storage is already updated, so the account write is best-effort.
	}
}
