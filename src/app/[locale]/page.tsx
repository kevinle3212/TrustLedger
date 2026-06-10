import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { ChainModePreviewToggle } from "@/app/[locale]/_components/ChainModePreviewToggle";
import { InteractiveContractPreview } from "@/app/[locale]/_components/InteractiveContractPreview";
import {
	getSolanaExplorerAddressUrl,
	getSolanaNetworkConfig,
	getSolanaSupportLabel,
	isLikelySolanaAddress,
	isSolanaCluster,
	resolveSolanaCluster,
	SOLANA_NETWORKS,
	SOLANA_SUPPORT_MODE,
} from "@/helpers/solana";

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
	const solanaCluster = resolveSolanaCluster(process.env["NEXT_PUBLIC_SOLANA_CLUSTER"]);
	const solanaNetwork = getSolanaNetworkConfig(solanaCluster);
	const solanaSupportLabel = getSolanaSupportLabel(SOLANA_SUPPORT_MODE);
	const solanaSystemProgramAddress = "11111111111111111111111111111111";
	const solanaExplorerUrl = getSolanaExplorerAddressUrl(
		solanaSystemProgramAddress,
		solanaCluster,
	);
	const trustLedgerSepoliaAddress =
		process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA ??
		process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS;
	const ethereumSepoliaUrl =
		trustLedgerSepoliaAddress !== undefined &&
		/^0x[0-9a-fA-F]{40}$/.test(trustLedgerSepoliaAddress)
			? `https://sepolia.etherscan.io/address/${trustLedgerSepoliaAddress}`
			: "https://sepolia.etherscan.io/";
	const solanaStatusIsValid =
		isSolanaCluster(solanaNetwork.cluster) &&
		isLikelySolanaAddress(solanaSystemProgramAddress) &&
		SOLANA_NETWORKS[solanaCluster].rpcUrl === solanaNetwork.rpcUrl;

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 sm:py-24">
			<section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
				<div className="max-w-2xl">
					<a
						href={ethereumSepoliaUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="tl-link-underline inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300"
					>
						{t("builtOn")}
					</a>
					<h1 className="mt-6 text-5xl font-bold leading-tight tracking-[-0.025em] text-gray-950 dark:text-white sm:text-6xl">
						{t("headline1")}{" "}
						<span className="text-indigo-600 dark:text-indigo-400">
							{t("headline2")}
						</span>
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300">
						{t("subtext")}
					</p>
					<a
						href={solanaExplorerUrl}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`View Solana system program on ${solanaNetwork.label}`}
						className="tl-link-underline mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
					>
						Solana {solanaSupportLabel}: {solanaNetwork.label}
						{solanaStatusIsValid ? "" : " (check config)"}
					</a>
					<ChainModePreviewToggle />
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

				<InteractiveContractPreview
					title={t("featureEscrowTitle")}
					amountLabel={tDashboard("amount")}
					deadlineLabel={tDashboard("deadline")}
					deadlineValue={tDashboard("exampleDeadline")}
					holdBackLabel={tDashboard("holdBack")}
					documentLabel={tDashboard("document")}
					viewLabel={tDashboard("view")}
					statuses={{
						PENDING: tStatus("PENDING"),
						ACTIVE: tStatus("ACTIVE"),
						APPROVED: tStatus("APPROVED"),
					}}
				/>
			</section>

			<section className="tl-protection-section grid gap-8 border-t border-gray-200 pt-10 dark:border-white/10 lg:grid-cols-[18rem_1fr]">
				<div>
					<h2 className="text-2xl font-semibold tracking-[-0.015em] text-gray-950 dark:text-white">
						{t("featureEscrowTitle")}
					</h2>
					<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("featureEscrowDesc")}
					</p>
				</div>
				<div className="tl-protection-list rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
					{features.map((feature, index) => (
						<div
							key={feature.title}
							className="tl-protection-item grid gap-4 p-5 sm:grid-cols-[3rem_1fr]"
							style={{ "--tl-item-index": index } as CSSProperties}
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
