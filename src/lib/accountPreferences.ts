"use client";

const DASHBOARD_VISITED_KEY = "tl_visited";
const PROFILE_STORAGE_HANDLE = ["trustledger", "profile", "handle"].join(":");

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
		const response = await fetch("/api/accounts/profile", {
			headers: { authorization: `Bearer ${token}` },
		});
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
		await fetch("/api/accounts/profile", {
			method: "PATCH",
			headers: {
				"authorization": `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({ onboardingComplete: true }),
		});
	} catch {
		// Local storage is already updated, so the account write is best-effort.
	}
}
