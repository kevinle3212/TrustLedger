import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata = {
	title: "TrustLedger",
	description: "Decentralized freelance escrow powered by Ethereum smart contracts.",
};

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);

	const [t, tDashboard, tStatus] = await Promise.all([
		getTranslations("Home"),
		getTranslations("Dashboard"),
		getTranslations("ContractStatus"),
	]);

	const features = [
		{ title: t("featureEscrowTitle"), desc: t("featureEscrowDesc") },
		{ title: t("featureArbitrationTitle"), desc: t("featureArbitrationDesc") },
		{ title: t("featureWarrantyTitle"), desc: t("featureWarrantyDesc") },
	];

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 sm:py-24">
			<section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
				<div className="max-w-2xl">
					<p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300">
						{t("builtOn")}
					</p>
					<h1 className="mt-6 text-5xl font-bold leading-tight tracking-[-0.025em] text-gray-950 dark:text-white sm:text-6xl">
						{t("headline1")}{" "}
						<span className="text-indigo-600 dark:text-indigo-400">
							{t("headline2")}
						</span>
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
						{t("subtext")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/create"
							className="tl-button-motion inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
						>
							{t("createContract")}
						</Link>
						<Link
							href="/dashboard"
							className="tl-button-motion inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white dark:focus-visible:ring-offset-gray-950"
						>
							{t("viewContracts")}
						</Link>
					</div>
				</div>

				<div className="tl-motion-card rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
					<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0">
								<p className="font-mono text-xs text-gray-500">#18</p>
								<h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
									{t("featureEscrowTitle")}
								</h2>
							</div>
							<span className="tl-status-badge tl-status-badge--active rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
								{tStatus("ACTIVE")}
							</span>
						</div>

						<div className="tl-kv-grid mt-6 text-sm">
							<span className="text-gray-500 dark:text-gray-400">
								{tDashboard("amount")}
							</span>
							<span className="font-medium text-gray-950 dark:text-white">
								0.75 ETH
							</span>
							<span className="text-gray-500 dark:text-gray-400">
								{tDashboard("deadline")}
							</span>
							<span className="font-medium text-gray-950 dark:text-white">
								{tDashboard("exampleDeadline")}
							</span>
							<span className="text-gray-500 dark:text-gray-400">
								{tDashboard("holdBack")}
							</span>
							<span className="font-medium text-gray-950 dark:text-white">10%</span>
							<span className="text-gray-500 dark:text-gray-400">
								{tDashboard("document")}
							</span>
							<span className="font-medium text-indigo-600 dark:text-indigo-400">
								{tDashboard("view")}
							</span>
						</div>
					</div>

					<div className="mt-4 flex flex-wrap gap-2 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
						<span className="rounded-lg border border-gray-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-gray-950">
							{tStatus("PENDING")}
						</span>
						<span className="tl-status-badge tl-status-badge--active rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-2 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-300">
							{tStatus("ACTIVE")}
						</span>
						<span className="rounded-lg border border-gray-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-gray-950">
							{tStatus("APPROVED")}
						</span>
					</div>
				</div>
			</section>

			<section className="grid gap-8 border-t border-gray-200 pt-10 dark:border-white/10 lg:grid-cols-[18rem_1fr]">
				<div>
					<h2 className="text-2xl font-semibold tracking-[-0.015em] text-gray-950 dark:text-white">
						{t("featureEscrowTitle")}
					</h2>
					<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("featureEscrowDesc")}
					</p>
				</div>
				<div className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-gray-50 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
					{features.map((feature, index) => (
						<div
							key={feature.title}
							className="tl-motion-card grid gap-4 p-5 sm:grid-cols-[3rem_1fr]"
						>
							<span className="flex size-10 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 dark:border-white/15 dark:bg-gray-950 dark:text-gray-200">
								{index + 1}
							</span>
							<div>
								<h3 className="font-semibold text-gray-950 dark:text-white">
									{feature.title}
								</h3>
								<p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
									{feature.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
