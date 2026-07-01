"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount, useDisconnect } from "wagmi";

import { Link } from "@/i18n/navigation";
import { OPEN_PREFERENCES_EVENT } from "@/lib/cookie-consent";
import { buildPersonalDataExport, clearLocalPersonalData } from "@/lib/personalData";

/**
 * Privacy & Data Rights controls for the account page. Exercises the rights the
 * privacy policy grants (access, portability, erasure, consent withdrawal) using
 * only what the app actually controls — this browser's local data — since
 * TrustLedger keeps no server-side user profile:
 *
 * - **Download My Data** exports every app-owned `localStorage` entry plus the
 *   connected wallet address as a JSON file.
 * - **Cookie Preferences** reopens the consent manager to view or revoke consent.
 * - **Delete My Data** erases all local data and signs the wallet out of this
 *   browser, with an explicit warning that public on-chain records are immutable
 *   and cannot be erased.
 */
export function PrivacyDataRights(): React.JSX.Element {
	const t = useTranslations("Privacy");
	const { address } = useAccount();
	const { disconnect } = useDisconnect();
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [deleted, setDeleted] = useState(false);

	const handleDownload = useCallback((): void => {
		const data = buildPersonalDataExport(address ?? null);
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `trustledger-personal-data-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	}, [address]);

	const handleOpenPreferences = useCallback((): void => {
		window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
	}, []);

	const handleConfirmDelete = useCallback((): void => {
		clearLocalPersonalData();
		disconnect();
		setConfirmingDelete(false);
		setDeleted(true);
	}, [disconnect]);

	return (
		<section className="mt-6" aria-labelledby="privacy-data-rights-heading">
			<article className="tl-motion-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
				<h2
					id="privacy-data-rights-heading"
					className="text-lg font-semibold text-gray-950 dark:text-white"
				>
					{t("title")}
				</h2>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("intro")}
				</p>

				<div className="mt-5">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						{t("collectTitle")}
					</h3>
					<ul className="mt-3 grid gap-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
						<li>{t("collectWallet")}</li>
						<li>{t("collectPreferences")}</li>
						<li>{t("collectConsent")}</li>
						<li>{t("collectOnChain")}</li>
					</ul>
					<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t.rich("policyLink", {
							link: (chunks) => (
								<Link
									href="/legal/privacy"
									className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-300"
								>
									{chunks}
								</Link>
							),
						})}
					</p>
				</div>

				<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
					<button
						type="button"
						onClick={handleDownload}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
					>
						{t("downloadButton")}
					</button>
					<button
						type="button"
						onClick={handleOpenPreferences}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						{t("cookiePreferencesButton")}
					</button>
					{!confirmingDelete && !deleted ? (
						<button
							type="button"
							onClick={() => {
								setConfirmingDelete(true);
							}}
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10"
						>
							{t("deleteButton")}
						</button>
					) : null}
				</div>

				{/*
				 * Inline confirmation, not a modal: it does not overlay or trap focus,
				 * so it stays a plain region led by its visible heading rather than a
				 * dialog. The destructive-action warning is a live region
				 * (role="alert") so it is announced the moment it appears.
				 */}
				{confirmingDelete ? (
					<div className="mt-5 rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-400/30 dark:bg-red-500/10">
						<h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
							{t("deleteConfirmTitle")}
						</h3>
						<p className="mt-2 text-sm leading-6 text-red-950 dark:text-red-50">
							{t("deleteConfirmBody")}
						</p>
						<p
							role="alert"
							className="mt-2 text-sm leading-6 text-red-950 dark:text-red-50"
						>
							{t("deleteImmutableWarning")}
						</p>
						<div className="mt-4 flex flex-col gap-3 sm:flex-row">
							<button
								type="button"
								onClick={handleConfirmDelete}
								className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
							>
								{t("deleteConfirmAction")}
							</button>
							<button
								type="button"
								onClick={() => {
									setConfirmingDelete(false);
								}}
								className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:text-white"
							>
								{t("deleteCancelAction")}
							</button>
						</div>
					</div>
				) : null}

				<p
					role="status"
					aria-live="polite"
					className="mt-4 text-sm leading-6 text-emerald-700 dark:text-emerald-300"
				>
					{deleted ? t("deleteDone") : ""}
				</p>
			</article>
		</section>
	);
}
