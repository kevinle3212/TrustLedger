"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { useTranslations } from "next-intl";

function ShieldIcon(): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			className="size-6"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 3 19 6v5c0 4.4-2.8 8.5-7 10-4.2-1.5-7-5.6-7-10V6l7-3Z" />
			<path d="M9.5 12.2 11.3 14l3.5-4" />
		</svg>
	);
}

/** Fallback page shown to unauthenticated users on wallet-gated routes. Prompts connection. */
export function WalletRequiredPage(): React.JSX.Element {
	const t = useTranslations("Common");

	return (
		<div className="tl-site-frame py-12 sm:py-16">
			<section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
				<div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 h-1 bg-indigo-600 dark:bg-indigo-400"
				/>
				<div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
					<div className="max-w-2xl">
						<div className="inline-flex size-12 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200">
							<ShieldIcon />
						</div>
						<h1 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-4xl dark:text-white">
							{t("walletRequiredTitle")}
						</h1>
						<p className="mt-4 max-w-xl text-base leading-7 text-gray-600 dark:text-gray-300">
							{t("walletRequiredBody")}
						</p>
						<div className="mt-7 flex flex-col items-start gap-3">
							<ConnectButton />
							<p className="max-w-lg text-sm leading-6 text-gray-500 dark:text-gray-400">
								{t("walletRequiredHint")}
							</p>
						</div>
					</div>
					<div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
						<p className="text-sm font-semibold text-gray-900 dark:text-white">
							{t("walletRequiredChecklistTitle")}
						</p>
						<ul className="mt-4 grid gap-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
							<li>{t("walletRequiredChecklistAddress")}</li>
							<li>{t("walletRequiredChecklistSecrets")}</li>
							<li>{t("walletRequiredChecklistNetwork")}</li>
						</ul>
					</div>
				</div>
			</section>
		</div>
	);
}
