"use client";

import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import {
	consentServerSnapshot,
	consentSnapshot,
	defaultDraft,
	OPEN_PREFERENCES_EVENT,
	parseConsent,
	readConsent,
	subscribeConsent,
	writeConsent,
} from "@/lib/cookie-consent";

/** Selectable (non-necessary) consent categories. */
type ToggleCategory = "functional" | "analytics";

/**
 * Cookie consent banner with granular controls (Accept All, Reject All, and a
 * Customize dialog). Returns nothing until hydration so consented users never
 * see a flash, and the banner stays hidden once a current decision exists —
 * unless the user re-opens preferences from the footer. Non-essential categories
 * stay off until the user actively opts in (GDPR / ePrivacy). The dialog is a
 * native `<dialog>` opened with `showModal()`, so focus trapping, `Escape` to
 * close, and the backdrop are handled by the browser.
 */
export function CookieConsent(): React.JSX.Element | null {
	const t = useTranslations("CookieConsent");
	// `useSyncExternalStore` reads the stored decision without a setState-in-effect:
	// the server snapshot is `null` (consent unknown), so the banner only appears
	// after hydration, and any change re-renders via the subscription.
	const raw = useSyncExternalStore(subscribeConsent, consentSnapshot, consentServerSnapshot);
	const decision = useMemo(() => parseConsent(raw), [raw]);

	const [draft, setDraft] = useState<{ functional: boolean; analytics: boolean }>({
		functional: false,
		analytics: false,
	});

	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descId = useId();

	// Seed the draft toggles from the current decision (or privacy-signal-aware
	// defaults), then open the preferences dialog imperatively. `showModal()`
	// provides focus trapping, `Escape` to close, the backdrop, and focus
	// restoration to the opener — no React state needed to track open/closed.
	const openPreferences = useCallback((): void => {
		const current = readConsent();
		setDraft(
			current !== null
				? { functional: current.functional, analytics: current.analytics }
				: defaultDraft(),
		);
		dialogRef.current?.showModal();
	}, []);

	const closeDialog = useCallback((): void => {
		dialogRef.current?.close();
	}, []);

	// Keep the latest opener in a ref so the footer-event listener can stay
	// subscribed once for the component's lifetime instead of re-binding.
	const openPreferencesRef = useRef(openPreferences);
	useEffect(() => {
		openPreferencesRef.current = openPreferences;
	}, [openPreferences]);

	// Allow the footer "Cookie Preferences" control to re-open the dialog.
	useEffect(() => {
		function handleOpen(): void {
			openPreferencesRef.current();
		}
		window.addEventListener(OPEN_PREFERENCES_EVENT, handleOpen);
		return (): void => {
			window.removeEventListener(OPEN_PREFERENCES_EVENT, handleOpen);
		};
	}, []);

	const persist = useCallback((choice: { functional: boolean; analytics: boolean }): void => {
		writeConsent(choice);
		dialogRef.current?.close();
	}, []);

	const acceptAll = useCallback(() => {
		persist({ functional: true, analytics: true });
	}, [persist]);

	const rejectAll = useCallback(() => {
		persist({ functional: false, analytics: false });
	}, [persist]);

	const saveDraft = useCallback(() => {
		persist(draft);
	}, [persist, draft]);

	function toggle(category: ToggleCategory): void {
		setDraft((previous) => ({ ...previous, [category]: !previous[category] }));
	}

	// True only after hydration: keeps the banner off the server/first-paint
	// markup so consented users never see a flash. No setState-in-effect.
	const isHydrated = useSyncExternalStore(
		(): (() => void) => (): void => undefined,
		(): boolean => true,
		(): boolean => false,
	);

	if (!isHydrated) return null;

	// When no decision exists the banner shows; if the dialog is also open its
	// backdrop simply covers the banner until the user decides.
	const showBanner = decision === null;

	const policyLinks = (
		<p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
			{t("learnMore")}{" "}
			<Link
				href="/legal/cookies"
				className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-300"
			>
				{t("cookiePolicy")}
			</Link>{" "}
			{t("and")}{" "}
			<Link
				href="/legal/privacy"
				className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-300"
			>
				{t("privacyPolicy")}
			</Link>
			.
		</p>
	);

	return (
		<>
			{showBanner && (
				<section
					aria-label={t("regionLabel")}
					className="tl-cookie-banner tl-safe-bottom fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-gray-950/95"
				>
					<div className="tl-site-frame flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="max-w-2xl space-y-2">
							<p className="text-sm font-semibold text-gray-950 dark:text-white">
								{t("title")}
							</p>
							<p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
								{t("body")}
							</p>
							{policyLinks}
						</div>
						<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-nowrap lg:justify-end">
							<button
								type="button"
								onClick={rejectAll}
								className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
							>
								{t("rejectAll")}
							</button>
							<button
								type="button"
								onClick={openPreferences}
								className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
							>
								{t("customize")}
							</button>
							<button
								type="button"
								onClick={acceptAll}
								className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
							>
								{t("acceptAll")}
							</button>
						</div>
					</div>
				</section>
			)}

			<dialog
				ref={dialogRef}
				aria-labelledby={titleId}
				aria-describedby={descId}
				className="tl-cookie-dialog m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-xl backdrop:bg-gray-950/40 backdrop:backdrop-blur-sm dark:border-white/10 dark:bg-gray-950"
			>
				<div className="flex items-start justify-between gap-4">
					<h2
						id={titleId}
						className="text-lg font-semibold text-gray-950 dark:text-white"
					>
						{t("preferencesTitle")}
					</h2>
					<button
						type="button"
						aria-label={t("close")}
						onClick={closeDialog}
						className="tl-button-motion -m-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
					>
						<svg
							aria-hidden="true"
							viewBox="0 0 20 20"
							className="size-5"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.8"
							strokeLinecap="round"
						>
							<path d="M5 5l10 10M15 5L5 15" />
						</svg>
					</button>
				</div>
				<p id={descId} className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("preferencesBody")}
				</p>

				<ul className="mt-5 space-y-3">
					<li className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-gray-950 dark:text-white">
									{t("necessaryTitle")}
								</p>
								<p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
									{t("necessaryBody")}
								</p>
							</div>
							<span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
								{t("alwaysOn")}
							</span>
						</div>
					</li>

					<li className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
						<label className="flex items-start justify-between gap-4">
							<span>
								<span className="block text-sm font-semibold text-gray-950 dark:text-white">
									{t("functionalTitle")}
								</span>
								<span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-gray-300">
									{t("functionalBody")}
								</span>
							</span>
							<input
								type="checkbox"
								checked={draft.functional}
								onChange={() => {
									toggle("functional");
								}}
								className="mt-1 size-5 shrink-0 cursor-pointer rounded border-gray-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/20 dark:bg-gray-900"
							/>
						</label>
					</li>

					<li className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
						<label className="flex items-start justify-between gap-4">
							<span>
								<span className="block text-sm font-semibold text-gray-950 dark:text-white">
									{t("analyticsTitle")}
								</span>
								<span className="mt-1 block text-xs leading-5 text-gray-600 dark:text-gray-300">
									{t("analyticsBody")}
								</span>
							</span>
							<input
								type="checkbox"
								checked={draft.analytics}
								onChange={() => {
									toggle("analytics");
								}}
								className="mt-1 size-5 shrink-0 cursor-pointer rounded border-gray-300 text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/20 dark:bg-gray-900"
							/>
						</label>
					</li>
				</ul>

				<div className="mt-5">{policyLinks}</div>

				<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
					<button
						type="button"
						onClick={rejectAll}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						{t("rejectAll")}
					</button>
					<button
						type="button"
						onClick={saveDraft}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
					>
						{t("savePreferences")}
					</button>
				</div>
			</dialog>
		</>
	);
}
