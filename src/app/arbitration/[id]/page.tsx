"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { encodePacked, formatEther, keccak256 } from "viem";
import { ARBITRATION_ABI } from "@/lib/abi";
import { ARBITRATION_ADDRESS } from "@/lib/wagmi";
import { formatAddress, formatDeadline } from "@/lib/utils";
import Link from "next/link";

// Phase enum mirrors Arbitration.sol
const PHASE_LABELS = ["Commit", "Reveal", "Finalized", "Appealed", "Appeal Commit", "Appeal Reveal", "Appeal Finalized"] as const;
const PHASE_COLORS: Record<number, string> = {
	0: "bg-yellow-500/20 text-yellow-300",
	1: "bg-blue-500/20 text-blue-300",
	2: "bg-green-500/20 text-green-300",
	3: "bg-red-500/20 text-red-300",
	4: "bg-yellow-500/20 text-yellow-300",
	5: "bg-blue-500/20 text-blue-300",
	6: "bg-green-500/20 text-green-300",
};

// APPEAL_BOND_MULTIPLIER_BPS = 15_000; BPS_DENOMINATOR = 10_000
function appealBond(feePool: bigint): bigint {
	return (feePool * 15000n) / 10000n;
}

// Linear payout: 2/3 × (pct/100) × amount
function linearPayout(pct: bigint, amount: bigint): bigint {
	return (2n * pct * amount) / (3n * 100n);
}

function saltKey(id: string): string {
	return `tl-dispute-${id}-salt`;
}
function pctKey(id: string): string {
	return `tl-dispute-${id}-pct`;
}

// ─── Permissionless action button ────────────────────────────────────────────

function PermissionlessButton({
	label,
	disputeId,
	functionName,
}: {
	label: string;
	disputeId: bigint;
	functionName: string;
}): React.JSX.Element {
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
	return (
		<div className="flex flex-col gap-1">
			<button
				disabled={isPending || isConfirming}
				onClick={() =>
					writeContract({
						address: ARBITRATION_ADDRESS,
						abi: ARBITRATION_ABI,
						functionName: functionName as never,
						args: [disputeId],
					})
				}
				className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
			>
				{isPending || isConfirming ? "…" : label}
			</button>
			{error && (
				<p className="text-xs text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
		</div>
	);
}

// ─── Commit vote form ─────────────────────────────────────────────────────────

function CommitForm({
	disputeId,
	address,
}: {
	disputeId: bigint;
	address: `0x${string}`;
}): React.JSX.Element {
	const [pct, setPct] = useState(50);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
	const idStr = disputeId.toString();

	function handleCommit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		const saltBytes = crypto.getRandomValues(new Uint8Array(32));
		const salt = `0x${Array.from(saltBytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}` as `0x${string}`;

		const commitment = keccak256(
			encodePacked(["uint256", "address", "uint256", "bytes32"], [disputeId, address, BigInt(pct), salt]),
		);

		localStorage.setItem(saltKey(idStr), salt);
		localStorage.setItem(pctKey(idStr), pct.toString());

		writeContract({
			address: ARBITRATION_ADDRESS,
			abi: ARBITRATION_ABI,
			functionName: "commitVote",
			args: [disputeId, commitment],
		});
	}

	if (isSuccess)
		return (
			<div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
				<p className="text-sm text-green-300 font-medium">Vote committed.</p>
				<p className="text-xs text-green-400/80 mt-1">
					Your salt and completion % have been saved to localStorage. You will need them to reveal.
				</p>
			</div>
		);

	return (
		<form onSubmit={handleCommit} className="flex flex-col gap-3">
			<p className="text-xs text-gray-400">
				Choose a completion percentage (0 = fully refund client, 100 = fully pay freelancer).
				A random salt will be generated and saved locally — do not clear your browser storage before revealing.
			</p>
			<div className="flex items-center gap-4">
				<input
					type="range"
					min={0}
					max={100}
					value={pct}
					onChange={(e) => setPct(Number(e.target.value))}
					className="flex-1 accent-indigo-500"
				/>
				<span className="w-12 text-right text-white font-mono text-sm">{pct}%</span>
			</div>
			{error && (
				<p className="text-xs text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming}
				className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? "Committing…" : "Commit Vote"}
			</button>
		</form>
	);
}

// ─── Reveal vote form ─────────────────────────────────────────────────────────

function RevealForm({ disputeId }: { disputeId: bigint }): React.JSX.Element {
	const idStr = disputeId.toString();
	const storedSalt = (typeof window !== "undefined" ? localStorage.getItem(saltKey(idStr)) : null) ?? "";
	const storedPct = (typeof window !== "undefined" ? localStorage.getItem(pctKey(idStr)) : null) ?? "50";

	const [pct, setPct] = useState(Number(storedPct));
	const [salt, setSalt] = useState(storedSalt);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	function handleReveal(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		writeContract({
			address: ARBITRATION_ADDRESS,
			abi: ARBITRATION_ABI,
			functionName: "revealVote",
			args: [disputeId, BigInt(pct), salt as `0x${string}`],
		});
	}

	if (isSuccess)
		return <p className="text-sm text-green-400">Vote revealed successfully.</p>;

	return (
		<form onSubmit={handleReveal} className="flex flex-col gap-3">
			<p className="text-xs text-gray-400">
				Enter the same percentage and salt you committed with. These are pre-filled from localStorage if
				available.
			</p>
			<div className="flex items-center gap-4">
				<input
					type="range"
					min={0}
					max={100}
					value={pct}
					onChange={(e) => setPct(Number(e.target.value))}
					className="flex-1 accent-indigo-500"
				/>
				<span className="w-12 text-right text-white font-mono text-sm">{pct}%</span>
			</div>
			<div className="flex flex-col gap-1">
				<label className="text-xs text-gray-500">Salt (bytes32)</label>
				<input
					type="text"
					value={salt}
					onChange={(e) => setSalt(e.target.value)}
					placeholder="0x…"
					className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
			</div>
			{error && (
				<p className="text-xs text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming || !salt}
				className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? "Revealing…" : "Reveal Vote"}
			</button>
		</form>
	);
}

// ─── Appeal button ────────────────────────────────────────────────────────────

function AppealButton({
	disputeId,
	feePool,
}: {
	disputeId: bigint;
	feePool: bigint;
}): React.JSX.Element {
	const bond = appealBond(feePool);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	if (isSuccess) return <p className="text-sm text-green-400">Appeal filed.</p>;

	return (
		<div className="flex flex-col gap-1">
			<p className="text-xs text-gray-400">
				Bond required: <span className="text-white">{formatEther(bond)} ETH</span> (1.5× fee pool).
				Returned if you win; forfeited if you lose.
			</p>
			{error && (
				<p className="text-xs text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				disabled={isPending || isConfirming}
				onClick={() =>
					writeContract({
						address: ARBITRATION_ADDRESS,
						abi: ARBITRATION_ABI,
						functionName: "appeal",
						args: [disputeId],
						value: bond,
					})
				}
				className="px-4 py-2 text-sm rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? "Filing Appeal…" : "File Appeal"}
			</button>
		</div>
	);
}

// ─── Main dispute page ────────────────────────────────────────────────────────

export default function ArbitrationPage(): React.JSX.Element {
	const { id } = useParams<{ id: string }>();
	const disputeId = BigInt(id ?? "0");
	const { address, isConnected } = useAccount();
	const nowS = BigInt(Math.floor(Date.now() / 1000));

	const { data: dispute, isLoading } = useReadContract({
		address: ARBITRATION_ADDRESS,
		abi: ARBITRATION_ABI,
		functionName: "getDispute",
		args: [disputeId],
	});
	const { data: jurors } = useReadContract({
		address: ARBITRATION_ADDRESS,
		abi: ARBITRATION_ABI,
		functionName: "getJurors",
		args: [disputeId],
	});
	const { data: isMajorityJuror } = useReadContract({
		address: ARBITRATION_ADDRESS,
		abi: ARBITRATION_ABI,
		functionName: "isMajority",
		args: [disputeId, address ?? "0x0000000000000000000000000000000000000000"],
		query: { enabled: !!address && !!dispute?.finalized },
	});

	if (isLoading || !dispute)
		return <div className="flex justify-center py-32 text-gray-500">Loading dispute…</div>;

	const phase = dispute.phase;
	const isSelectedJuror = jurors?.some((j) => j.toLowerCase() === address?.toLowerCase()) ?? false;
	const isClient = address?.toLowerCase() === dispute.client.toLowerCase();
	const isFreelancer = address?.toLowerCase() === dispute.freelancer.toLowerCase();
	const isParty = isClient || isFreelancer;
	const phaseDeadlinePassed = nowS > dispute.phaseDeadline;
	const appealWindowOpen = dispute.finalized && !dispute.appealed && nowS <= dispute.phaseDeadline;
	const canExecute = dispute.finalized && !dispute.appealed && nowS > dispute.phaseDeadline;

	const MAX_UINT256 = (2n ** 256n) - 1n;
	const rulingSet = dispute.ruling !== MAX_UINT256;

	return (
		<div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-2">
				<div>
					<span className="text-xs text-gray-500">Dispute</span>
					<h1 className="text-3xl font-bold">#{id}</h1>
					<p className="text-gray-400 text-sm mt-1">
						Contract{" "}
						<Link
							href="/dashboard"
							className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
						>
							#{dispute.contractId.toString()}
						</Link>
					</p>
				</div>
				<span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${PHASE_COLORS[phase] ?? ""}`}>
					{PHASE_LABELS[phase] ?? `Phase ${phase}`}
				</span>
			</div>

			{/* Info grid */}
			<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
					<span className="text-gray-500">Client</span>
					<span className="text-white font-mono">{formatAddress(dispute.client)}</span>

					<span className="text-gray-500">Freelancer</span>
					<span className="text-white font-mono">{formatAddress(dispute.freelancer)}</span>

					<span className="text-gray-500">Contract Amount</span>
					<span className="text-white">{formatEther(dispute.contractAmount)} ETH</span>

					<span className="text-gray-500">Fee Pool</span>
					<span className="text-white">{formatEther(dispute.feePool)} ETH</span>

					<span className="text-gray-500">Phase Deadline</span>
					<span className={`${phaseDeadlinePassed ? "text-red-400" : "text-white"}`}>
						{formatDeadline(dispute.phaseDeadline)}
						{phaseDeadlinePassed && " (elapsed)"}
					</span>

					<span className="text-gray-500">Jurors</span>
					<span className="text-white">
						{dispute.jurorCount.toString()} / {dispute.maxJurors.toString()}
					</span>
				</div>
			</div>

			{/* Ruling */}
			{rulingSet && (
				<div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 flex flex-col gap-2">
					<h2 className="font-semibold text-white">Ruling</h2>
					<p className="text-2xl font-bold text-green-300">{dispute.ruling.toString()}% complete</p>
					<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-1">
						<span className="text-gray-500">Freelancer receives</span>
						<span className="text-white">
							{formatEther(linearPayout(dispute.ruling, dispute.contractAmount))} ETH
						</span>
						<span className="text-gray-500">Client receives</span>
						<span className="text-white">
							{formatEther(dispute.contractAmount - linearPayout(dispute.ruling, dispute.contractAmount) - dispute.feePool)} ETH
						</span>
					</div>
				</div>
			)}

			{/* Jurors list */}
			{jurors && jurors.length > 0 && (
				<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3">
					<h2 className="font-semibold text-white text-sm">Selected Jurors</h2>
					<div className="flex flex-col gap-1">
						{jurors.map((j) => (
							<span key={j} className="text-xs font-mono text-gray-300">
								{j}
							</span>
						))}
					</div>
				</div>
			)}

			{/* Actions */}
			<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
				<h2 className="font-semibold text-white text-sm">Actions</h2>

				{!isConnected && (
					<div className="flex flex-col gap-2">
						<p className="text-sm text-gray-400">Connect your wallet to interact.</p>
						<ConnectButton />
					</div>
				)}

				{/* Juror: commit phase */}
				{isConnected && isSelectedJuror && (phase === 0 || phase === 4) && !phaseDeadlinePassed && (
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-yellow-300">You are selected — commit your vote</p>
						<CommitForm disputeId={disputeId} address={address!} />
					</div>
				)}

				{/* Juror: reveal phase */}
				{isConnected && isSelectedJuror && (phase === 1 || phase === 5) && !phaseDeadlinePassed && (
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-blue-300">Reveal your vote</p>
						<RevealForm disputeId={disputeId} />
					</div>
				)}

				{/* Juror: claim reward */}
				{isConnected && isSelectedJuror && dispute.finalized && isMajorityJuror && (
					<PermissionlessButton label="Claim Reward" disputeId={disputeId} functionName="claimReward" />
				)}

				{/* Permissionless: advance to reveal */}
				{(phase === 0 || phase === 4) && (phaseDeadlinePassed || dispute.jurorCount >= dispute.maxJurors) && (
					<PermissionlessButton label="Advance to Reveal" disputeId={disputeId} functionName="advanceToReveal" />
				)}

				{/* Permissionless: finalize */}
				{(phase === 1 || phase === 5) && phaseDeadlinePassed && (
					<PermissionlessButton label="Finalize Dispute" disputeId={disputeId} functionName="finalizeDispute" />
				)}

				{/* Party: appeal */}
				{isConnected && isParty && appealWindowOpen && (
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-red-400">Appeal window open (72h after finalization)</p>
						<AppealButton disputeId={disputeId} feePool={dispute.feePool} />
					</div>
				)}

				{/* Permissionless: execute ruling */}
				{canExecute && (
					<div className="flex flex-col gap-1">
						<p className="text-xs text-gray-400">Appeal window elapsed — ruling can be executed.</p>
						<PermissionlessButton label="Execute Ruling" disputeId={disputeId} functionName="executeRuling" />
					</div>
				)}

				{/* Nothing to do */}
				{isConnected && !isSelectedJuror && !isParty && dispute.finalized && (
					<p className="text-sm text-gray-500">You are not a party or juror in this dispute.</p>
				)}
			</div>
		</div>
	);
}
