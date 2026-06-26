"use client";

import { useEffect, useMemo, useState } from "react";
import {
	useAccount,
	useChainId,
	useReadContract,
	useReadContracts,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { WalletRequiredPage } from "@/components/WalletRequiredPage";
import { formatEther, parseEther } from "viem";
import { AssetSelector } from "@/components/staking/AssetSelector";
import { UsdcStakePanel } from "@/components/staking/UsdcStakePanel";
import { getAllStakeAssetStatuses, getStakeAssetStatus } from "@/lib/staking/config";
import type { StakeAssetId } from "@/lib/staking/assets";
import { ARBITRATION_ABI, JUROR_REGISTRY_ABI } from "@/lib/abi";
import { ARBITRATION_ADDRESS, JUROR_REGISTRY_ADDRESS } from "@/lib/wagmi";
import { formatAddress, formatDeadline } from "@/lib/utils";
import { validateEthAmount } from "@/lib/validation";
import { getRecentDisputeIds } from "@/hooks/useRecentDisputeIds";
import { calculateLinearPayout, isActionableJurorPhase, isRulingSet } from "@/utils/arbitration";
import { readEvidenceDraftHistory, type EvidenceDraftHistoryItem } from "@/store/arbitrationDrafts";

// Minimum stake to register or top up, in ETH (mirrors the JurorRegistry contract).
const MIN_STAKE_ETH = 0.01;

/** Validates a juror stake amount: a positive ETH value of at least `minEth`. */
function validateStake(
	value: string,
	minEth: number,
	minimumMessage: string,
	maxEth?: number,
): string | undefined {
	const base = validateEthAmount(value, maxEth);
	if (base !== undefined) return base;
	return Number(value) < minEth ? minimumMessage : undefined;
}

const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

// Captured at module load; avoids calling Date.now() during render
const PAGE_LOAD_TIME_S = BigInt(Math.floor(Date.now() / 1000));

interface DisputeRecord {
	contractId: bigint;
	client: `0x${string}`;
	phase: number;
	finalized: boolean;
	appealed: boolean;
	vrfFulfilled: boolean;
	phaseDeadline: bigint;
	freelancer: `0x${string}`;
	contractAmount: bigint;
	feePool: bigint;
	ruling: bigint;
	appealer: `0x${string}`;
	appealBond: bigint;
	appealDisputeId: bigint;
	parentDisputeId: bigint;
	maxJurors: bigint;
	jurorCount: bigint;
}

function formatTimestamp(ts: bigint, locale?: string): string {
	if (ts === 0n) return "-";
	return new Date(Number(ts) * 1000).toLocaleDateString(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function StatusCard({ address }: { address: `0x${string}` }): React.JSX.Element {
	const t = useTranslations("Juror");
	const locale = useLocale();
	const { data: juror, isLoading } = useReadContract({
		address: JUROR_REGISTRY_ADDRESS,
		abi: JUROR_REGISTRY_ABI,
		functionName: "getJuror",
		args: [address],
	});
	const { data: eligible } = useReadContract({
		address: JUROR_REGISTRY_ADDRESS,
		abi: JUROR_REGISTRY_ABI,
		functionName: "isEligible",
		args: [address],
	});
	const { data: cooldown } = useReadContract({
		address: JUROR_REGISTRY_ADDRESS,
		abi: JUROR_REGISTRY_ABI,
		functionName: "getCooldownUntil",
		args: [address],
	});
	const { data: poolCount } = useReadContract({
		address: JUROR_REGISTRY_ADDRESS,
		abi: JUROR_REGISTRY_ABI,
		functionName: "eligibleJurorCount",
	});

	if (isLoading) return <div className="text-gray-500 text-sm">{t("loading")}</div>;

	const isRegistered = juror?.active === true || (juror?.stake ?? 0n) > 0n;
	const lockElapsed = juror !== undefined ? PAGE_LOAD_TIME_S >= juror.stakeUnlockTime : false;
	const cooldownActive = cooldown !== undefined && cooldown > 0n && PAGE_LOAD_TIME_S < cooldown;

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">{t("yourStatus")}</h2>
				<span
					className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
						eligible === true
							? "bg-green-500/20 text-green-600 dark:text-green-300"
							: "bg-gray-500/20 text-gray-600 dark:text-gray-400"
					}`}
				>
					{eligible === true
						? t("eligible")
						: isRegistered
							? t("ineligible")
							: t("notRegistered")}
				</span>
			</div>

			<div className="tl-kv-grid text-sm">
				<span className="text-gray-500">{t("address")}</span>
				<span className="text-gray-900 dark:text-white font-mono">
					{formatAddress(address)}
				</span>

				<span className="text-gray-500">{t("stake")}</span>
				<span className="text-gray-900 dark:text-white">
					{juror !== undefined ? formatEther(juror.stake) : "0"} ETH
				</span>

				<span className="text-gray-500">{t("reputation")}</span>
				<span className="text-gray-900 dark:text-white">
					{juror !== undefined ? juror.reputation.toString() : "-"} / 100
				</span>

				<span className="text-gray-500">{t("disputes")}</span>
				<span className="text-gray-900 dark:text-white">
					{juror !== undefined ? juror.disputesParticipated.toString() : "-"}
				</span>

				<span className="text-gray-500">{t("minorityVotes")}</span>
				<span className="text-gray-900 dark:text-white">
					{juror !== undefined ? juror.minorityVotes.toString() : "-"}
				</span>

				<span className="text-gray-500">{t("stakeUnlocks")}</span>
				<span
					className={
						lockElapsed
							? "text-green-700 dark:text-green-400"
							: "text-yellow-600 dark:text-yellow-300"
					}
				>
					{juror !== undefined
						? lockElapsed
							? t("unlocked")
							: formatTimestamp(juror.stakeUnlockTime, locale)
						: "-"}
				</span>

				{cooldownActive && (
					<>
						<span className="text-gray-500">{t("cooldownUntil")}</span>
						<span className="text-yellow-600 dark:text-yellow-300">
							{formatTimestamp(cooldown, locale)}
						</span>
					</>
				)}

				<span className="text-gray-500">{t("poolSize")}</span>
				<span className="text-gray-900 dark:text-white">
					{poolCount !== undefined
						? t("eligibleJurors", { count: poolCount.toString() })
						: "-"}
				</span>
			</div>

			{eligible !== true && isRegistered && (
				<div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-600 dark:text-yellow-300 space-y-1">
					{!lockElapsed && (
						<p>
							{t("stakeLockedFor7Days", {
								date: formatTimestamp(juror?.stakeUnlockTime ?? 0n, locale),
							})}
						</p>
					)}
					{juror !== undefined && juror.reputation < 20n && (
						<p>{t("reputationBelowMin")}</p>
					)}
					{cooldownActive && (
						<p>
							{t("cooldownActiveUntil", {
								date: formatTimestamp(cooldown, locale),
							})}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

// Asset-aware staking entry point. The selector chooses which asset to stake; ETH renders the
// existing JurorRegistry register flow, while USDC and SOL render their on-chain availability
// (driven by getAllStakeAssetStatuses) until their contracts/program are configured for the
// connected network. No mocked transaction path is shown for an unconfigured asset.
function AssetStakeSwitcher({ address }: { address: `0x${string}` }): React.JSX.Element {
	const t = useTranslations("Juror");
	const chainId = useChainId();
	const [asset, setAsset] = useState<StakeAssetId>("ETH");

	const statuses = useMemo(() => getAllStakeAssetStatuses({ chainId }), [chainId]);
	const selectedStatus = useMemo(() => getStakeAssetStatus(asset, { chainId }), [asset, chainId]);

	return (
		<div className="flex flex-col gap-4">
			<AssetSelector
				statuses={statuses}
				value={asset}
				onChange={setAsset}
				groupLabel={t("selectAsset")}
				statusLabel={(configured) => (configured ? t("assetReady") : t("assetSoon"))}
			/>
			{asset === "ETH" ? (
				<RegisterForm />
			) : asset === "USDC" && selectedStatus.configured ? (
				<UsdcStakePanel account={address} />
			) : (
				<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-2">
					<p className="font-semibold text-gray-900 dark:text-white">
						{selectedStatus.asset.symbol}
					</p>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						{selectedStatus.configured
							? t("assetConfiguredSoon", { asset: selectedStatus.asset.symbol })
							: t("assetUnavailable", { asset: selectedStatus.asset.symbol })}
					</p>
				</div>
			)}
		</div>
	);
}

function RegisterForm(): React.JSX.Element {
	const t = useTranslations("Juror");
	const [ethAmount, setEthAmount] = useState("0.01");
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const amountError = validateStake(
		ethAmount,
		MIN_STAKE_ETH,
		t("minimumEth", { amount: MIN_STAKE_ETH.toString() }),
	);

	function handleRegister(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setTouched(true);
		if (amountError !== undefined) return;
		let value: bigint;
		try {
			value = parseEther(ethAmount);
		} catch {
			return;
		}
		writeContract({
			address: JUROR_REGISTRY_ADDRESS,
			abi: JUROR_REGISTRY_ABI,
			functionName: "register",
			value,
		});
	}

	if (isSuccess)
		return (
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3">
				<p className="text-sm text-green-700 dark:text-green-400">
					{t("registered", { days: SEVEN_DAYS_S / 86400 })}
				</p>
				<button
					type="button"
					onClick={reset}
					className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline self-start"
				>
					{t("registerAnother")}
				</button>
			</div>
		);

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-gray-900 dark:text-white">
					{t("registerTitle")}
				</h2>
				<p className="text-xs text-gray-500 mt-1">{t("registerSubtitle")}</p>
			</div>
			<form onSubmit={handleRegister} className="flex flex-col gap-3">
				<div className="flex gap-2 items-center">
					<input
						aria-label={t("stakeAmountLabel")}
						type="number"
						min="0.01"
						step="0.001"
						value={ethAmount}
						onChange={(e) => {
							setEthAmount(e.target.value);
						}}
						onBlur={() => {
							setTouched(true);
						}}
						aria-invalid={touched && amountError !== undefined}
						className={`w-36 rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
							touched && amountError !== undefined
								? "border-red-500 dark:border-red-500 focus:ring-red-500"
								: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
						}`}
					/>
					<span className="text-sm text-gray-500 dark:text-gray-400">ETH</span>
				</div>
				{touched && amountError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{amountError}</p>
				)}
				{error !== null && (
					<p className="text-xs text-red-500 dark:text-red-400">
						{(error as { shortMessage?: string }).shortMessage ?? error.message}
					</p>
				)}
				<button
					type="submit"
					disabled={isPending || isConfirming || amountError !== undefined}
					className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors self-start"
				>
					{isPending || isConfirming ? t("registering") : t("register")}
				</button>
			</form>
		</div>
	);
}

function ManageStakePanel({ address }: { address: `0x${string}` }): React.JSX.Element {
	const t = useTranslations("Juror");
	const [addAmount, setAddAmount] = useState("0.01");
	const [unstakeAmount, setUnstakeAmount] = useState("");
	const [addTouched, setAddTouched] = useState(false);
	const [unstakeTouched, setUnstakeTouched] = useState(false);

	const {
		writeContract: writeAdd,
		data: addHash,
		isPending: addPending,
		error: writeAddError,
	} = useWriteContract();
	const { isLoading: addConfirming } = useWaitForTransactionReceipt({ hash: addHash });

	const {
		writeContract: writeUnstake,
		data: unstakeHash,
		isPending: unstakePending,
		error: writeUnstakeError,
	} = useWriteContract();
	const { isLoading: unstakeConfirming } = useWaitForTransactionReceipt({ hash: unstakeHash });

	const { data: juror } = useReadContract({
		address: JUROR_REGISTRY_ADDRESS,
		abi: JUROR_REGISTRY_ABI,
		functionName: "getJuror",
		args: [address],
	});

	const isRegistered = juror?.active === true || (juror?.stake ?? 0n) > 0n;

	const maxUnstakeEth = juror !== undefined ? Number(formatEther(juror.stake)) : undefined;
	const addError = validateStake(addAmount, 0.001, t("minimumEth", { amount: "0.001" }));
	const unstakeError = validateStake(
		unstakeAmount,
		0.001,
		t("minimumEth", { amount: "0.001" }),
		maxUnstakeEth,
	);

	if (!isRegistered) return <></>;

	function handleAdd(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setAddTouched(true);
		if (addError !== undefined) return;
		let value: bigint;
		try {
			value = parseEther(addAmount);
		} catch {
			return;
		}
		writeAdd({
			address: JUROR_REGISTRY_ADDRESS,
			abi: JUROR_REGISTRY_ABI,
			functionName: "addStake",
			value,
		});
	}

	function handleUnstake(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setUnstakeTouched(true);
		if (unstakeError !== undefined) return;
		let amount: bigint;
		try {
			amount = parseEther(unstakeAmount);
		} catch {
			return;
		}
		writeUnstake({
			address: JUROR_REGISTRY_ADDRESS,
			abi: JUROR_REGISTRY_ABI,
			functionName: "unstake",
			args: [amount],
		});
	}

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-5">
			<h2 className="font-semibold text-gray-900 dark:text-white">{t("manageStakeTitle")}</h2>

			<form onSubmit={handleAdd} className="flex flex-col gap-2">
				<label htmlFor="add-stake-amount" className="text-xs text-gray-500">
					{t("addStake")}
				</label>
				<div className="flex gap-2 items-center">
					<input
						id="add-stake-amount"
						type="number"
						min="0.001"
						step="0.001"
						value={addAmount}
						onChange={(e) => {
							setAddAmount(e.target.value);
						}}
						onBlur={() => {
							setAddTouched(true);
						}}
						aria-invalid={addTouched && addError !== undefined}
						className={`w-36 rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
							addTouched && addError !== undefined
								? "border-red-500 dark:border-red-500 focus:ring-red-500"
								: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
						}`}
					/>
					<span className="text-sm text-gray-500 dark:text-gray-400">ETH</span>
					<button
						type="submit"
						disabled={addPending || addConfirming || addError !== undefined}
						className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
					>
						{addPending || addConfirming ? "…" : t("addStake")}
					</button>
				</div>
				{addTouched && addError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{addError}</p>
				)}
				{writeAddError !== null && (
					<p className="text-xs text-red-500 dark:text-red-400">
						{(writeAddError as { shortMessage?: string }).shortMessage ??
							writeAddError.message}
					</p>
				)}
			</form>

			<form onSubmit={handleUnstake} className="flex flex-col gap-2">
				<label htmlFor="unstake-amount" className="text-xs text-gray-500">
					{juror !== undefined
						? t("withdrawStakeMax", { amount: formatEther(juror.stake) })
						: t("withdrawStake")}
				</label>
				<div className="flex gap-2 items-center">
					<input
						id="unstake-amount"
						type="number"
						min="0.001"
						step="0.001"
						value={unstakeAmount}
						onChange={(e) => {
							setUnstakeAmount(e.target.value);
						}}
						onBlur={() => {
							setUnstakeTouched(true);
						}}
						placeholder="0.01"
						aria-invalid={unstakeTouched && unstakeError !== undefined}
						className={`w-36 rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 ${
							unstakeTouched && unstakeError !== undefined
								? "border-red-500 dark:border-red-500 focus:ring-red-500"
								: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
						}`}
					/>
					<span className="text-sm text-gray-500 dark:text-gray-400">ETH</span>
					<button
						type="submit"
						disabled={unstakePending || unstakeConfirming || unstakeError !== undefined}
						className="px-3 py-1.5 text-xs rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-medium transition-colors"
					>
						{unstakePending || unstakeConfirming ? "…" : t("unstake")}
					</button>
				</div>
				{unstakeTouched && unstakeError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{unstakeError}</p>
				)}
				{writeUnstakeError !== null && (
					<p className="text-xs text-red-500 dark:text-red-400">
						{(writeUnstakeError as { shortMessage?: string }).shortMessage ??
							writeUnstakeError.message}
					</p>
				)}
			</form>
		</div>
	);
}

function OpenDisputesPanel({ address }: { address: `0x${string}` }): React.JSX.Element {
	const t = useTranslations("Juror");
	const locale = useLocale();
	const { data: nextDisputeId } = useReadContract({
		address: ARBITRATION_ADDRESS,
		abi: ARBITRATION_ABI,
		functionName: "nextDisputeId",
	});
	const disputeIds = getRecentDisputeIds(nextDisputeId);
	const { data: disputeReads } = useReadContracts({
		contracts: disputeIds.flatMap((disputeId) => [
			{
				address: ARBITRATION_ADDRESS,
				abi: ARBITRATION_ABI,
				functionName: "getDispute",
				args: [disputeId],
			},
			{
				address: ARBITRATION_ADDRESS,
				abi: ARBITRATION_ABI,
				functionName: "getJurors",
				args: [disputeId],
			},
			{
				address: ARBITRATION_ADDRESS,
				abi: ARBITRATION_ABI,
				functionName: "getEvidenceCount",
				args: [disputeId],
			},
		]),
		query: { enabled: disputeIds.length > 0 },
	});

	const assigned = disputeIds
		.map((disputeId, index) => {
			const base = index * 3;
			const disputeResult = disputeReads?.[base];
			const jurorsResult = disputeReads?.[base + 1];
			const evidenceResult = disputeReads?.[base + 2];
			if (disputeResult?.status !== "success" || jurorsResult?.status !== "success") {
				return undefined;
			}
			const jurors = jurorsResult.result as unknown as `0x${string}`[];
			const selected = jurors.some((juror) => juror.toLowerCase() === address.toLowerCase());
			if (!selected) return undefined;
			return {
				disputeId,
				dispute: disputeResult.result as unknown as DisputeRecord,
				evidenceCount: evidenceResult?.status === "success" ? evidenceResult.result : 0n,
			};
		})
		.filter(
			(item): item is { disputeId: bigint; dispute: DisputeRecord; evidenceCount: bigint } =>
				item !== undefined,
		);

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-gray-900 dark:text-white">
					{t("assignedDisputes")}
				</h2>
				<p className="text-xs text-gray-500 mt-1">{t("assignedDisputesSubtitle")}</p>
			</div>
			{assigned.length === 0 ? (
				<p className="text-sm text-gray-500 dark:text-gray-400">
					{t("noAssignedDisputes")}
				</p>
			) : (
				<div className="flex flex-col gap-3">
					{assigned.map(({ disputeId, dispute, evidenceCount }) => {
						const phaseOpen = isActionableJurorPhase(dispute.phase);
						const rulingReady = isRulingSet(dispute.ruling);
						return (
							<div
								key={disputeId.toString()}
								className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/10 p-4 flex flex-col gap-3"
							>
								<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="text-sm font-semibold text-gray-900 dark:text-white">
											{t("disputeNumber", { id: disputeId.toString() })}
										</p>
										<p className="text-xs text-gray-500">
											{t("contractEvidenceSummary", {
												contractId: dispute.contractId.toString(),
												count: evidenceCount.toString(),
											})}
										</p>
									</div>
									<span className="text-xs text-gray-500">
										{formatDeadline(dispute.phaseDeadline, locale)}
									</span>
								</div>
								<div className="tl-kv-grid text-xs">
									<span className="text-gray-500">{t("feePool")}</span>
									<span className="text-gray-900 dark:text-white">
										{formatEther(dispute.feePool)} ETH
									</span>
									<span className="text-gray-500">{t("potentialOutcome")}</span>
									<span className="text-gray-900 dark:text-white">
										{rulingReady
											? t("freelancerPayout", {
													amount: formatEther(
														calculateLinearPayout(
															dispute.ruling,
															dispute.contractAmount,
														),
													),
												})
											: t("pendingJurorRuling")}
									</span>
								</div>
								<Link
									href={`/arbitration/${disputeId.toString()}`}
									className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors self-start ${
										phaseOpen
											? "bg-indigo-600 hover:bg-indigo-500 text-white"
											: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white"
									}`}
								>
									{phaseOpen ? t("openVotingFlow") : t("reviewDispute")}
								</Link>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function LocalDraftHistoryPanel(): React.JSX.Element {
	const t = useTranslations("Juror");
	const locale = useLocale();
	const dateTimeFormatter = useMemo(
		() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
		[locale],
	);
	const [drafts, setDrafts] = useState<EvidenceDraftHistoryItem[]>([]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDrafts(readEvidenceDraftHistory());
		}, 0);
		return (): void => {
			window.clearTimeout(timer);
		};
	}, []);

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-gray-900 dark:text-white">
					{t("localDraftHistory")}
				</h2>
				<p className="text-xs text-gray-500 mt-1">{t("localDraftHistorySubtitle")}</p>
			</div>
			{drafts.length === 0 ? (
				<p className="text-sm text-gray-500 dark:text-gray-400">{t("noLocalDrafts")}</p>
			) : (
				<div className="flex flex-col gap-3">
					{drafts.map((draft) => (
						<div
							key={`${draft.disputeId}-${draft.updatedAt.toString()}`}
							className="rounded-xl border border-gray-200 bg-white/70 p-4 dark:border-white/10 dark:bg-black/10"
						>
							<div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
								<p className="text-sm font-semibold text-gray-900 dark:text-white">
									{t("disputeNumber", { id: draft.disputeId })}
								</p>
								<span className="text-xs text-gray-500">
									{draft.updatedAt > 0
										? dateTimeFormatter.format(new Date(draft.updatedAt))
										: t("notTimestamped")}
								</span>
							</div>
							<p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
								{draft.summary}
							</p>
							<p className="mt-2 text-xs text-gray-500">
								{t("requestedCompletion", {
									percent: draft.requestedCompletionPct.toString(),
								})}
							</p>
							<Link
								href={`/arbitration/${draft.disputeId}`}
								className="mt-3 inline-flex rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
							>
								{t("openDraftCase")}
							</Link>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function JurorPageInner(): React.JSX.Element {
	const t = useTranslations("Juror");
	const { address, isConnected } = useAccount();

	if (!isConnected || address === undefined) {
		return <WalletRequiredPage />;
	}

	return (
		<div className="tl-app-shell tl-app-shell--focused">
			<div className="tl-page-header">
				<div>
					<h1 className="tl-page-title">{t("title")}</h1>
					<p className="tl-page-description text-gray-500 dark:text-gray-400">
						{t("subtitle")}
					</p>
				</div>
			</div>
			<div className="tl-two-column-stack">
				<div className="tl-stack-main">
					<OpenDisputesPanel address={address} />
					<LocalDraftHistoryPanel />
					<StatusCard address={address} />
					<ManageStakePanel address={address} />
				</div>
				<div className="tl-stack-side">
					<AssetStakeSwitcher address={address} />
				</div>
			</div>
		</div>
	);
}
