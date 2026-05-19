"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseEther } from "viem";
import { JUROR_REGISTRY_ABI } from "@/lib/abi";
import { JUROR_REGISTRY_ADDRESS } from "@/lib/wagmi";
import { formatAddress } from "@/lib/utils";

const SEVEN_DAYS_S = 7 * 24 * 60 * 60;

function formatTimestamp(ts: bigint): string {
	if (ts === 0n) return "—";
	return new Date(Number(ts) * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function StatusCard({ address }: { address: `0x${string}` }): React.JSX.Element {
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

	if (isLoading) return <div className="text-gray-500 text-sm">Loading…</div>;

	const isRegistered = juror?.active === true || (juror?.stake ?? 0n) > 0n;
	const nowS = BigInt(Math.floor(Date.now() / 1000));
	const lockElapsed = juror ? nowS >= juror.stakeUnlockTime : false;
	const cooldownActive = cooldown !== undefined && cooldown > 0n && nowS < cooldown;

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-white">Your Juror Status</h2>
				<span
					className={`text-xs font-medium px-2 py-0.5 rounded-full ${
						eligible ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"
					}`}
				>
					{eligible ? "Eligible" : isRegistered ? "Ineligible" : "Not Registered"}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
				<span className="text-gray-500">Address</span>
				<span className="text-white font-mono">{formatAddress(address)}</span>

				<span className="text-gray-500">Stake</span>
				<span className="text-white">{juror ? formatEther(juror.stake) : "0"} ETH</span>

				<span className="text-gray-500">Reputation</span>
				<span className="text-white">
					{juror ? juror.reputation.toString() : "—"} / 100
				</span>

				<span className="text-gray-500">Disputes</span>
				<span className="text-white">
					{juror ? juror.disputesParticipated.toString() : "—"}
				</span>

				<span className="text-gray-500">Minority Votes</span>
				<span className="text-white">{juror ? juror.minorityVotes.toString() : "—"}</span>

				<span className="text-gray-500">Stake Unlocks</span>
				<span className={`${lockElapsed ? "text-green-400" : "text-yellow-300"}`}>
					{juror
						? lockElapsed
							? "Unlocked"
							: formatTimestamp(juror.stakeUnlockTime)
						: "—"}
				</span>

				{cooldownActive && (
					<>
						<span className="text-gray-500">Cooldown Until</span>
						<span className="text-yellow-300">{formatTimestamp(cooldown!)}</span>
					</>
				)}

				<span className="text-gray-500">Pool Size</span>
				<span className="text-white">{poolCount?.toString() ?? "—"} eligible jurors</span>
			</div>

			{!eligible && isRegistered && (
				<div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-300 space-y-1">
					{!lockElapsed && (
						<p>
							Stake is locked for 7 days after deposit. Eligible after{" "}
							{formatTimestamp(juror!.stakeUnlockTime)}.
						</p>
					)}
					{juror && juror.reputation < 20n && (
						<p>
							Reputation below minimum (20). Minority votes reduce reputation by 10
							each.
						</p>
					)}
					{cooldownActive && (
						<p>Post-dispute cooldown active until {formatTimestamp(cooldown!)}.</p>
					)}
				</div>
			)}
		</div>
	);
}

function RegisterForm(): React.JSX.Element {
	const [ethAmount, setEthAmount] = useState("0.01");
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	function handleRegister(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
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
			<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3">
				<p className="text-sm text-green-400">
					Registered. Stake is locked for {SEVEN_DAYS_S / 86400} days before eligibility
					activates.
				</p>
				<button
					onClick={reset}
					className="text-xs text-gray-400 hover:text-white underline self-start"
				>
					Register another
				</button>
			</div>
		);

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
			<div>
				<h2 className="font-semibold text-white">Register as Juror</h2>
				<p className="text-xs text-gray-500 mt-1">
					Stake at least 0.01 ETH. Stake is locked 7 days before you become eligible.
					Minority votes slash 10% of your stake.
				</p>
			</div>
			<form onSubmit={handleRegister} className="flex flex-col gap-3">
				<div className="flex gap-2 items-center">
					<input
						type="number"
						min="0.01"
						step="0.001"
						value={ethAmount}
						onChange={(e) => setEthAmount(e.target.value)}
						className="w-36 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<span className="text-sm text-gray-400">ETH</span>
				</div>
				{error && (
					<p className="text-xs text-red-400">
						{(error as { shortMessage?: string }).shortMessage ?? error.message}
					</p>
				)}
				<button
					type="submit"
					disabled={isPending || isConfirming}
					className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors self-start"
				>
					{isPending || isConfirming ? "Registering…" : "Register"}
				</button>
			</form>
		</div>
	);
}

function ManageStakePanel({ address }: { address: `0x${string}` }): React.JSX.Element {
	const [addAmount, setAddAmount] = useState("0.01");
	const [unstakeAmount, setUnstakeAmount] = useState("");

	const {
		writeContract: writeAdd,
		data: addHash,
		isPending: addPending,
		error: addError,
	} = useWriteContract();
	const { isLoading: addConfirming } = useWaitForTransactionReceipt({ hash: addHash });

	const {
		writeContract: writeUnstake,
		data: unstakeHash,
		isPending: unstakePending,
		error: unstakeError,
	} = useWriteContract();
	const { isLoading: unstakeConfirming } = useWaitForTransactionReceipt({ hash: unstakeHash });

	const { data: juror } = useReadContract({
		address: JUROR_REGISTRY_ADDRESS,
		abi: JUROR_REGISTRY_ABI,
		functionName: "getJuror",
		args: [address],
	});

	const isRegistered = juror?.active === true || (juror?.stake ?? 0n) > 0n;
	if (!isRegistered) return <></>;

	function handleAdd(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
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
		<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-5">
			<h2 className="font-semibold text-white">Manage Stake</h2>

			<form onSubmit={handleAdd} className="flex flex-col gap-2">
				<label className="text-xs text-gray-500">Add Stake</label>
				<div className="flex gap-2 items-center">
					<input
						type="number"
						min="0.001"
						step="0.001"
						value={addAmount}
						onChange={(e) => setAddAmount(e.target.value)}
						className="w-36 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<span className="text-sm text-gray-400">ETH</span>
					<button
						type="submit"
						disabled={addPending || addConfirming}
						className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
					>
						{addPending || addConfirming ? "…" : "Add"}
					</button>
				</div>
				{addError && (
					<p className="text-xs text-red-400">
						{(addError as { shortMessage?: string }).shortMessage ?? addError.message}
					</p>
				)}
			</form>

			<form onSubmit={handleUnstake} className="flex flex-col gap-2">
				<label className="text-xs text-gray-500">
					Withdraw Stake{juror ? ` (max ${formatEther(juror.stake)} ETH)` : ""}
				</label>
				<div className="flex gap-2 items-center">
					<input
						type="number"
						min="0.001"
						step="0.001"
						value={unstakeAmount}
						onChange={(e) => setUnstakeAmount(e.target.value)}
						placeholder="0.01"
						className="w-36 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
					/>
					<span className="text-sm text-gray-400">ETH</span>
					<button
						type="submit"
						disabled={unstakePending || unstakeConfirming}
						className="px-3 py-1.5 text-xs rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-medium transition-colors"
					>
						{unstakePending || unstakeConfirming ? "…" : "Unstake"}
					</button>
				</div>
				{unstakeError && (
					<p className="text-xs text-red-400">
						{(unstakeError as { shortMessage?: string }).shortMessage ??
							unstakeError.message}
					</p>
				)}
			</form>
		</div>
	);
}

export default function JurorPage(): React.JSX.Element {
	const { address, isConnected } = useAccount();

	if (!isConnected || address === undefined) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-400 text-lg">
					Connect your wallet to manage your juror registration.
				</p>
				<ConnectButton />
			</div>
		);
	}

	return (
		<div className="max-w-lg mx-auto px-6 py-12 flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold">Juror Panel</h1>
				<p className="text-gray-400 text-sm mt-1">
					Stake ETH to become eligible for dispute committees. Earn fees for majority
					votes.
				</p>
			</div>
			<StatusCard address={address} />
			<RegisterForm />
			<ManageStakePanel address={address} />
		</div>
	);
}
