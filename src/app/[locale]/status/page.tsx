import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Platform Status | TrustLedger",
	description:
		"Public TrustLedger operations center for runtime health, privacy-safe analytics, and contract summary metrics.",
};

const statusLinks = [
	["Runtime Health", "/api/health/runtime"],
	["Full Health Report", "/api/health"],
	["Public Status API", "/api/status"],
	["Scientific Analytics API", "/api/analytics/scientific"],
] as const;

export default function StatusPage(): React.JSX.Element {
	return (
		<main className="tl-site-frame py-12">
			<section className="rounded-3xl border border-gray-200 bg-gray-50 p-8 dark:border-white/10 dark:bg-white/[0.03]">
				<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
					Platform Status
				</p>
				<h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-5xl dark:text-white">
					Public Operations Center
				</h1>
				<p className="mt-4 max-w-3xl text-base leading-7 text-gray-600 dark:text-gray-300">
					Review public runtime health, privacy-safe analytics artifacts, and contract
					summary metrics without exposing admin tokens, RPC credentials, API keys, raw
					documents, or private wallet material.
				</p>
			</section>

			<section className="mt-8 grid gap-4 md:grid-cols-2">
				{statusLinks.map(([label, href]) => (
					<a
						key={href}
						href={href}
						className="tl-motion-card group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-indigo-200 hover:bg-indigo-50/70 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/30 dark:hover:bg-indigo-400/10"
					>
						<span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
							{label}
						</span>
						<span className="mt-2 block font-mono text-sm text-gray-600 group-hover:text-gray-950 dark:text-gray-300 dark:group-hover:text-white">
							{href}
						</span>
					</a>
				))}
			</section>

			<div className="mt-8">
				<Link
					href="/analytics"
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
				>
					Open Wallet Analytics
				</Link>
			</div>
		</main>
	);
}
