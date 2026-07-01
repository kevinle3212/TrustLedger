/**
 * Cookie consent core: a small, dependency-free store that the consent banner
 * and the analytics beacon both read from, so a user's choice is honored
 * everywhere without prop drilling.
 *
 * Design goals (US + EU compliance):
 * - Opt-in by default: non-essential categories stay off until the user
 *   actively consents (GDPR / ePrivacy).
 * - Granular: each non-essential category is independently togglable.
 * - Withdrawable: the choice can be re-opened and changed at any time.
 * - Signal-aware: a Global Privacy Control / Do Not Track signal pre-rejects
 *   non-essential categories (CCPA/CPRA "do not sell or share").
 */

/** A persisted consent decision. */
export interface ConsentState {
	readonly necessary: true;
	readonly functional: boolean;
	readonly analytics: boolean;
	/** ISO timestamp of the decision, used to expire stale consent. */
	readonly decidedAt: string;
	/** Schema version; bumping it re-prompts every user. */
	readonly version: number;
}

/** Storage key for the persisted decision (localStorage) and mirror cookie. */
const CONSENT_STORAGE_KEY = "tl-cookie-consent";

/** Current consent schema version. Bump to force a fresh prompt. */
const CONSENT_VERSION = 1;

/** Consent is re-requested after this many days (EU guidance: ~6-12 months). */
const CONSENT_MAX_AGE_DAYS = 180;

/** Event dispatched on `window` whenever the stored decision changes. */
const CONSENT_CHANGED_EVENT = "tl:cookie-consent-changed";

/** Event the footer dispatches to re-open the preferences dialog. */
export const OPEN_PREFERENCES_EVENT = "tl:open-cookie-preferences";

/** Returns true when the browser signals a privacy opt-out (GPC or DNT). */
export function hasPrivacySignal(): boolean {
	if (typeof navigator === "undefined") return false;
	const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
	return navigator.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function isConsentState(value: unknown): value is ConsentState {
	if (value === null || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		candidate["necessary"] === true &&
		typeof candidate["functional"] === "boolean" &&
		typeof candidate["analytics"] === "boolean" &&
		typeof candidate["decidedAt"] === "string" &&
		candidate["version"] === CONSENT_VERSION
	);
}

function isExpired(state: ConsentState): boolean {
	const decided = Date.parse(state.decidedAt);
	if (Number.isNaN(decided)) return true;
	const ageDays = (Date.now() - decided) / 86_400_000;
	return ageDays > CONSENT_MAX_AGE_DAYS;
}

/**
 * Reads the stored decision. Returns `null` when no valid, current decision
 * exists (no choice yet, schema bumped, or consent expired) — the caller should
 * then show the banner.
 */
export function readConsent(): ConsentState | null {
	if (typeof window === "undefined") return null;
	return parseConsent(consentSnapshot());
}

/** Parse a raw stored value into a valid, current decision, or `null`. */
export function parseConsent(raw: string | null): ConsentState | null {
	if (raw === null) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isConsentState(parsed) || isExpired(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}

/** Convenience: has the user granted analytics consent? */
export function hasAnalyticsConsent(): boolean {
	return readConsent()?.analytics === true;
}

/**
 * Persists a decision to localStorage and a mirror cookie, then notifies
 * listeners via {@link CONSENT_CHANGED_EVENT}. The cookie lets server code read
 * consent on the next request without shipping it in the URL.
 */
export function writeConsent(choice: { functional: boolean; analytics: boolean }): ConsentState {
	const state: ConsentState = {
		necessary: true,
		functional: choice.functional,
		analytics: choice.analytics,
		decidedAt: new Date().toISOString(),
		version: CONSENT_VERSION,
	};
	if (typeof window !== "undefined") {
		try {
			window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Storage may be unavailable (private mode); the cookie still records it.
		}
		const maxAge = String(CONSENT_MAX_AGE_DAYS * 86_400);
		const value = `${state.analytics ? "1" : "0"}${state.functional ? "f" : ""}`;
		document.cookie = `${CONSENT_STORAGE_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
		window.dispatchEvent(
			new CustomEvent<ConsentState>(CONSENT_CHANGED_EVENT, { detail: state }),
		);
	}
	return state;
}

/**
 * Subscribe to consent changes for `useSyncExternalStore`. Re-renders fire on
 * our in-tab change event and on cross-tab `storage` events.
 */
export function subscribeConsent(onChange: () => void): () => void {
	if (typeof window === "undefined") return () => undefined;
	window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
	window.addEventListener("storage", onChange);
	return (): void => {
		window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
		window.removeEventListener("storage", onChange);
	};
}

/**
 * Stable client snapshot for `useSyncExternalStore`: the raw stored string (or
 * `null`). Returning a primitive keeps the snapshot referentially stable.
 */
export function consentSnapshot(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(CONSENT_STORAGE_KEY);
	} catch {
		return null;
	}
}

/** Server snapshot: consent is unknown until the client hydrates. */
export function consentServerSnapshot(): null {
	return null;
}

/** Default toggles shown before a decision: pre-rejected when a signal is set. */
export function defaultDraft(): { functional: boolean; analytics: boolean } {
	const optedOut = hasPrivacySignal();
	return { functional: !optedOut, analytics: false };
}
