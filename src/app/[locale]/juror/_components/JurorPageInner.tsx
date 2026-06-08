"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useLocale, useTranslations } from "next-intl";
import { ConnectButton } from "@/components/ConnectButton";
import { formatEther, parseEther } from "viem";
import { JUROR_REGISTRY_ABI } from "@/lib/abi";
import { JUROR_REGISTRY_ADDRESS } from "@/lib/wagmi";
import { formatAddress } from "@/lib/utils";
import { validateEthAmount } from "@/lib/validation";

// Minimum stake to register or top up, in ETH (mirrors the JurorRegistry contract).
const MIN_STAKE_ETH = 0.01;

/** Validates a juror stake amount: a positive ETH value of at least `minEth`. */
function validateStake(value: string, minEth: number, maxEth?: number): string | undefined {
	const base = validateEthAmount(value, maxEth);
	if (base !== undefined) return base;
	return Number(value) < minEth ? `Minimum is ${minEth.toString()} ETH.` : undefined;
}

const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

// Captured at module load; avoids calling Date.now() during render
const PAGE_LOAD_TIME_S = BigInt(Math.floor(Date.now() / 1000));

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
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">{t("yourStatus")}</h2>
				<span
					className={`text-xs font-medium px-2 py-0.5 rounded-full ${
						eligible === true
							? "bg-green-500/20 text-green-600 dark:text-green-300"
							: "bg-gray-500/20 text-gray-500 dark:text-gray-400"
					}`}
				>
					{eligible === true
						? t("eligible")
						: isRegistered
							? t("ineligible")
							: t("notRegistered")}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
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
							? "text-green-500 dark:text-green-400"
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

function RegisterForm(): React.JSX.Element {
	const t = useTranslations("Juror");
	const [ethAmount, setEthAmount] = useState("0.01");
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const amountError = validateStake(ethAmount, MIN_STAKE_ETH);

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
				<p className="text-sm text-green-500 dark:text-green-400">
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
	const addError = validateStake(addAmount, 0.001);
	const unstakeError = validateStake(unstakeAmount, 0.001, maxUnstakeEth);

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

export function JurorPageInner(): React.JSX.Element {
	const t = useTranslations("Juror");
	const { address, isConnected } = useAccount();

	if (!isConnected || address === undefined) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-500 dark:text-gray-400 text-lg">{t("connectWallet")}</p>
				<ConnectButton />
			</div>
		);
	}

	return (
		<div className="max-w-lg mx-auto px-6 py-12 flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold">{t("title")}</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t("subtitle")}</p>
			</div>
			<StatusCard address={address} />
			<RegisterForm />
			<ManageStakePanel address={address} />
		</div>
	);
}
