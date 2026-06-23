"use client";

import { WalletRequiredPage } from "@/components/WalletRequiredPage";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { REPUTATION_REGISTRY_ABI, TRUSTLEDGER_ABI } from "@/lib/abi";
import { getLastWallet } from "@/lib/lastWallet";
import { readLocalDashboardVisited } from "@/lib/accountPreferences";
import { formatAddress } from "@/lib/utils";
import {
	ANALYTICS_STATUS_LABELS,
	buildWalletAnalyticsSummary,
	type WalletAnalyticsSummary,
} from "@/lib/walletAnalytics";
import { getContractDeployment, getNetworkName, ZERO_ADDRESS } from "@/lib/wagmi";
import type { Contract } from "@/types";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useSyncExternalStore } from "react";
import { useAccount, useChainId, useReadContract, useReadContracts } from "wagmi";

// Recharts is heavy; load the chart wrappers on demand so it stays out of the
// initial bundle. The analytics view is client-gated, so `ssr: false` is safe.
const BreakdownDonut = dynamic(
	async () => (await import("@/components/charts/BreakdownDonut")).BreakdownDonut,
	{ ssr: false },
);
const TrendLineChart = dynamic(
	async () => (await import("@/components/charts/TrendLineChart")).TrendLineChart,
	{ ssr: false },
);

const subscribeNoop = (): (() => void) => (): void => undefined;
const ENGLISH_LANGUAGE_DISPLAY_NAMES = new Intl.DisplayNames(["en"], { type: "language" });
const ACTIVITY_LINE_LABELS = [
	"PENDING",
	"ACTIVE",
	"SUBMITTED",
	"APPROVED",
	"DISPUTED",
	"RESOLVED",
] as const;

function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		() => true,
		() => false,
	);
}

function readDashboardGuideState(): string {
	try {
		return readLocalDashboardVisited() ? "guideStateCompleted" : "guideStateAvailable";
	} catch {
		return "localStorageUnavailable";
	}
}

function formatReputationScore(value: unknown): { score: string; count: string } {
	if (!Array.isArray(value)) return { score: "-", count: "0" };
	const [numerator, denominator] = value as unknown as readonly [
		bigint | undefined,
		bigint | undefined,
	];
	if (numerator === undefined || denominator === undefined || denominator === 0n) {
		return { score: "-", count: "0" };
	}
	return {
		score: (Number(numerator) / Number(denominator)).toFixed(1),
		count: denominator.toString(),
	};
}

function MetricCard({
	label,
	value,
	detail,
	tone = "neutral",
}: {
	readonly label: string;
	readonly value: string;
	readonly detail: string;
	readonly tone?: "neutral" | "success" | "warning" | "info";
}): React.JSX.Element {
	const toneClass = {
		neutral: "border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
		success:
			"border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/10",
		warning: "border-amber-200 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-400/10",
		info: "border-indigo-200 bg-indigo-50/70 dark:border-indigo-400/20 dark:bg-indigo-400/10",
	}[tone];

	return (
		<div className={`tl-motion-card rounded-2xl border p-5 ${toneClass}`}>
			<p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</p>
			<p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-gray-950 dark:text-white">
				{value}
			</p>
			<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{detail}</p>
		</div>
	);
}

function RoleDonut({
	summary,
}: {
	readonly summary: WalletAnalyticsSummary | null;
}): React.JSX.Element {
	const t = useTranslations("Analytics");
	const clientCount = summary?.asClient ?? 0;
	const freelancerCount = summary?.asFreelancer ?? 0;
	const totalRoles = clientCount + freelancerCount;
	const clientShare = totalRoles === 0 ? 0 : Math.round((clientCount / totalRoles) * 100);
	const roleData = [
		{ name: t("clientRole"), value: clientCount, color: "#6366f1" },
		{ name: t("freelancerRole"), value: freelancerCount, color: "#10b981" },
	];

	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
						{t("roleMixTitle")}
					</h2>
					<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
						{t("roleMixBody")}
					</p>
				</div>
				<span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-white/10 dark:text-gray-300">
					{t("rolesCount", { count: totalRoles })}
				</span>
			</div>
			<div className="mt-6 grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-center">
				<div className="relative">
					<BreakdownDonut data={roleData} ariaLabel={t("roleMixAria")} height={144} />
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
						<span className="text-lg font-semibold text-gray-950 dark:text-white">
							{clientShare}%
						</span>
						<span className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">
							{t("clientRole")}
						</span>
					</div>
				</div>
				<div className="grid gap-3 text-sm">
					<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-3 dark:border-white/10">
						<span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
							<span className="h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
							{t("clientRole")}
						</span>
						<span className="font-mono text-gray-500 dark:text-gray-400">
							{(summary?.asClient ?? 0).toString()}
						</span>
					</div>
					<div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-3 dark:border-white/10">
						<span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
							<span className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-300" />
							{t("freelancerRole")}
						</span>
						<span className="font-mono text-gray-500 dark:text-gray-400">
							{(summary?.asFreelancer ?? 0).toString()}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function OutcomeGraph({
	summary,
}: {
	readonly summary: WalletAnalyticsSummary | null;
}): React.JSX.Element {
	const t = useTranslations("Analytics");
	const total = Math.max(summary?.totalContracts ?? 0, 1);
	const outcomes = [
		{
			label: t("outcomeCompleted"),
			value: summary?.completed ?? 0,
			className: "bg-emerald-500",
		},
		{ label: t("outcomeActive"), value: summary?.active ?? 0, className: "bg-indigo-500" },
		{ label: t("outcomeDisputed"), value: summary?.disputed ?? 0, className: "bg-red-500" },
	] as const;

	return (
		<div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
			<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
				{t("outcomeSnapshotTitle")}
			</h2>
			<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
				{t("outcomeSnapshotBody")}
			</p>
			<div className="mt-6 grid gap-4">
				{outcomes.map((outcome) => {
					const width = `${Math.max(outcome.value === 0 ? 0 : 8, Math.round((outcome.value / total) * 100)).toString()}%`;
					return (
						<div key={outcome.label} className="grid gap-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium text-gray-700 dark:text-gray-200">
									{outcome.label}
								</span>
								<span className="font-mono text-gray-500 dark:text-gray-400">
									{outcome.value.toString()}
								</span>
							</div>
							<div className="h-4 overflow-hidden rounded-full bg-white ring-1 ring-gray-200 dark:bg-gray-950 dark:ring-white/10">
								<div
									className={`h-full rounded-full ${outcome.className}`}
									style={{ width }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function formatLocaleDisplay(locale: string): string {
	const languageName = ENGLISH_LANGUAGE_DISPLAY_NAMES.of(locale) ?? locale;
	return `${languageName.charAt(0).toUpperCase()}${languageName.slice(1)} (${locale})`;
}

function ActivityLineChart({
	summary,
}: {
	readonly summary: WalletAnalyticsSummary | null;
}): React.JSX.Element {
	const t = useTranslations("Analytics");
	const tStatus = useTranslations("ContractStatus");
	const points = ACTIVITY_LINE_LABELS.map((label, index) => ({
		label: tStatus(label),
		value: summary?.statusCounts[index] ?? 0,
	}));

	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
						{t("activityTitle")}
					</h2>
					<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
						{t("activityBody")}
					</p>
				</div>
				<span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100">
					{t("lineChart")}
				</span>
			</div>
			<div className="mt-5">
				<TrendLineChart data={points} ariaLabel={t("lineChartAria")} />
			</div>
		</div>
	);
}

export function AnalyticsPageInner(): React.JSX.Element {
	const t = useTranslations("Analytics");
	const tStatus = useTranslations("ContractStatus");
	const locale = useLocale();
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const deployment = getContractDeployment(chainId);
	const networkName = getNetworkName(chainId);
	const mounted = useMounted();
	const localGuideState = mounted ? readDashboardGuideState() : "loadingLocalState";
	const rememberedWallet = mounted ? getLastWallet() : null;

	const { data: nextId, isLoading: countLoading } = useReadContract({
		address: deployment.trustLedger,
		abi: TRUSTLEDGER_ABI,
		functionName: "nextId",
		query: { enabled: isConnected && deployment.trustLedger !== ZERO_ADDRESS },
	});

	const total = Number(nextId ?? 0n);
	const contractConfigs = useMemo(
		() =>
			Array.from({ length: total }, (_, index) => ({
				address: deployment.trustLedger,
				abi: TRUSTLEDGER_ABI,
				functionName: "getContract" as const,
				args: [BigInt(index)] as [bigint],
			})),
		[deployment.trustLedger, total],
	);
	const { data: allContracts, isLoading: contractsLoading } = useReadContracts({
		contracts: contractConfigs,
		query: { enabled: isConnected && contractConfigs.length > 0 },
	});

	const { data: reputationData } = useReadContract({
		address: deployment.reputationRegistry,
		abi: REPUTATION_REGISTRY_ABI,
		functionName: "averageRating",
		args: [address ?? ZERO_ADDRESS],
		query: {
			enabled:
				isConnected &&
				address !== undefined &&
				deployment.reputationRegistry !== ZERO_ADDRESS,
		},
	});

	const publicContracts = useMemo(
		() =>
			(allContracts ?? [])
				.map((result) => (result.status === "success" ? result.result : undefined))
				.filter((contract): contract is Contract => contract !== undefined),
		[allContracts],
	);
	const summary = useMemo(
		() =>
			address === undefined ? null : buildWalletAnalyticsSummary(publicContracts, address),
		[publicContracts, address],
	);
	const reputation = formatReputationScore(reputationData);
	const maxStatus = Math.max(...(summary?.statusCounts ?? [0]), 1);
	const loading = countLoading || contractsLoading;
	const localeDisplay = formatLocaleDisplay(locale);
	const analyticsInsight =
		summary === null
			? t("emptyInsight")
			: summary.totalContracts === 0
				? t("insightNoContracts")
				: summary.disputeRatePct >= 25
					? t("insightHighDispute")
					: summary.completionRatePct >= 75
						? t("insightHealthy")
						: t("insightDeveloping");

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
				</div>
				<aside className="tl-motion-card rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-400/20 dark:bg-indigo-400/10">
					<p className="text-sm font-semibold text-indigo-700 dark:text-indigo-200">
						{t("privacyTitle")}
					</p>
					<p className="mt-2 text-sm leading-6 text-indigo-950 dark:text-indigo-100">
						{t("privacyBody")}
					</p>
				</aside>
			</section>

			<section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label={t("walletLabel")}
					value={formatAddress(address)}
					detail={t("walletDetail", { network: networkName })}
					tone="info"
				/>
				<MetricCard
					label={t("contractsLabel")}
					value={loading || summary === null ? "..." : summary.totalContracts.toString()}
					detail={t("contractsDetail", {
						client: summary?.asClient ?? 0,
						freelancer: summary?.asFreelancer ?? 0,
					})}
					tone="neutral"
				/>
				<MetricCard
					label={t("completionLabel")}
					value={summary === null ? "0%" : `${summary.completionRatePct.toString()}%`}
					detail={t("completionDetail", { completed: summary?.completed ?? 0 })}
					tone="success"
				/>
				<MetricCard
					label={t("privacyScoreLabel")}
					value={summary === null ? "100" : summary.privacyScore.toString()}
					detail={t("privacyScoreDetail")}
					tone={(summary?.privacyScore ?? 100) >= 80 ? "success" : "warning"}
				/>
			</section>

			<section className="mt-8 grid gap-6 lg:grid-cols-2">
				<RoleDonut summary={summary} />
				<OutcomeGraph summary={summary} />
			</section>

			<section className="mt-8">
				<ActivityLineChart summary={summary} />
			</section>

			<section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
				<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
								{t("statusTitle")}
							</h2>
							<p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
								{t("statusBody")}
							</p>
						</div>
						<span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800 shadow-sm shadow-cyan-950/5 dark:border-cyan-300/30 dark:bg-cyan-300/15 dark:text-cyan-100">
							{t("publicOnly")}
						</span>
					</div>
					<div className="mt-6 grid gap-3">
						{ANALYTICS_STATUS_LABELS.map((label, index) => {
							const value = summary?.statusCounts[index] ?? 0;
							const width = `${Math.max(6, Math.round((value / maxStatus) * 100)).toString()}%`;
							return (
								<div key={label} className="grid gap-2">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium text-gray-700 dark:text-gray-200">
											{tStatus(label)}
										</span>
										<span className="font-mono text-gray-500 dark:text-gray-400">
											{value}
										</span>
									</div>
									<div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
										<div
											className="tl-analytics-bar h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
											style={{ width }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="grid gap-6">
					<div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
						<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
							{t("insightTitle")}
						</h2>
						<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{analyticsInsight}
						</p>
						<div className="mt-5 grid grid-cols-2 gap-3 text-sm">
							<div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-950">
								<p className="text-gray-500 dark:text-gray-400">
									{t("reputation")}
								</p>
								<p className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
									{reputation.score}
								</p>
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-950">
								<p className="text-gray-500 dark:text-gray-400">{t("ratings")}</p>
								<p className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
									{reputation.count}
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
						<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
							{t("localTitle")}
						</h2>
						<dl className="mt-4 grid gap-3 text-sm">
							<div className="flex items-center justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">
									{t("connector")}
								</dt>
								<dd className="font-medium text-gray-900 dark:text-white">
									{rememberedWallet ?? t("notStored")}
								</dd>
							</div>
							<div className="flex items-center justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">
									{t("guideState")}
								</dt>
								<dd className="text-right font-medium text-gray-900 dark:text-white">
									{t(localGuideState)}
								</dd>
							</div>
							<div className="flex items-center justify-between gap-4">
								<dt className="text-gray-500 dark:text-gray-400">{t("locale")}</dt>
								<dd className="font-medium text-gray-900 dark:text-white">
									{localeDisplay}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</section>

			<section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/[0.03]">
				<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
					<div>
						<h2 className="text-xl font-semibold text-gray-950 dark:text-white">
							{t("actionsTitle")}
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{t("actionsBody")}
						</p>
					</div>
					<div className="flex flex-col gap-3 sm:flex-row">
						<Link
							href="/dashboard"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
						>
							{t("openDashboard")}
						</Link>
						<Link
							href="/reputation"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("openReputation")}
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
