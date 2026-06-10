"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { WalletRequiredPage } from "@/components/WalletRequiredPage";
import { Link } from "@/i18n/navigation";
import { useAccount } from "wagmi";

export default function AccountPage(): React.JSX.Element {
	const { address, isConnected } = useAccount();

	if (!isConnected || address === undefined) {
		return <WalletRequiredPage />;
	}

	return (
		<main className="tl-site-frame py-12">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
				<div>
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						Off-Chain Account
					</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-5xl dark:text-white">
						Wallet-Gated Profile And Preferences
					</h1>
					<p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300">
						TrustLedger account services use signed wallet authentication for profile
						preferences, notifications, and encrypted in-app messaging metadata. The
						service never asks for passwords, seed phrases, private keys, raw documents,
						or session keys.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<ConnectButton />
						<Link
							href="/analytics"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							Open Wallet Analytics
						</Link>
					</div>
				</div>
				<aside className="tl-motion-card rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/10">
					<p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
						Security Boundary
					</p>
					<ul className="mt-3 grid gap-3 text-sm leading-6 text-emerald-950 dark:text-emerald-50">
						<li>Sign Typed Wallet Challenges Only</li>
						<li>Use Short-Lived Server Sessions</li>
						<li>Store Profile Preferences Off-Chain</li>
						<li>Keep Documents And Keys Out Of Account APIs</li>
					</ul>
				</aside>
			</section>

			<section className="mt-10 grid gap-4 md:grid-cols-3">
				{[
					[
						"Profile Preferences",
						"Display name, avatar URL, notification preferences, and dashboard onboarding state can follow the wallet across devices once a signed session exists.",
					],
					[
						"Encrypted Messaging Ready",
						"The API boundary is designed for encrypted message envelopes; plaintext personal contact details do not belong in platform messages.",
					],
					[
						"External Database Needed",
						"Production persistence should use Postgres, Supabase, or another managed database configured through deployment secrets.",
					],
				].map(([title, body]) => (
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
		</main>
	);
}
