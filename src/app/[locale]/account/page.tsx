"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { InactivityTimeoutSetting } from "@/components/InactivityTimeoutSetting";
import { PrivacyDataRights } from "@/components/PrivacyDataRights";
import { TwoFactorSetting } from "@/components/TwoFactorSetting";
import { WalletRequiredPage } from "@/components/WalletRequiredPage";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";

export default function AccountPage(): React.JSX.Element {
	const t = useTranslations("Account");
	const { address, isConnected } = useAccount();
	const cards = [
		{ title: t("profilePreferencesTitle"), body: t("profilePreferencesBody") },
		{ title: t("encryptedMessagingTitle"), body: t("encryptedMessagingBody") },
		{ title: t("externalDatabaseTitle"), body: t("externalDatabaseBody") },
	];

	if (!isConnected || address === undefined) {
		return <WalletRequiredPage />;
	}

	return (
		<main className="tl-site-frame py-12">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div>
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						{t("eyebrow")}
					</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-5xl dark:text-white">
						{t("title")}
					</h1>
					<p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300">
						{t("intro")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<ConnectButton />
						<Link
							href="/analytics"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("openWalletAnalytics")}
						</Link>
					</div>
				</div>
				<aside className="tl-motion-card rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/10">
					<p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
						{t("securityBoundary")}
					</p>
					<ul className="mt-3 grid gap-3 text-sm leading-6 text-emerald-950 dark:text-emerald-50">
						<li>{t("securityTypedChallenges")}</li>
						<li>{t("securityShortSessions")}</li>
						<li>{t("securityProfilePreferences")}</li>
						<li>{t("securityNoDocuments")}</li>
					</ul>
				</aside>
			</section>

			<section className="mt-10 grid gap-4 md:grid-cols-3">
				{cards.map(({ title, body }) => (
					<article
						key={title}
						className="tl-motion-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]"
					>
						<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
							{title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{body}
						</p>
					</article>
				))}
			</section>

			<section className="mt-6">
				<article className="tl-motion-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
					<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
						{t("autoLogoutTitle")}
					</h2>
					<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("autoLogoutBody")}
					</p>
					<div className="mt-4 max-w-xs">
						<InactivityTimeoutSetting />
					</div>
				</article>
			</section>

			<section className="mt-6">
				<TwoFactorSetting />
			</section>

			<PrivacyDataRights />
		</main>
	);
}
