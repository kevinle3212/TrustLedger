"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, keccak256, toBytes } from "viem";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { REPUTATION_REGISTRY_ADDRESS, TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { formatAddress, formatDeadline, STATUS_COLORS } from "@/lib/utils";
import Link from "next/link";

const PAGE_LOAD_TIME_S = BigInt(Math.floor(Date.now() / 1000));

interface EscrowContract {
	client: `0x${string}`;
	arbitrationFeeBps: number;
	holdBackBps: number;
	status: number;
	freelancer: `0x${string}`;
	warrantyDeadline: bigint;
	projectDeadline: bigint;
	acceptanceWindow: bigint;
	acceptanceDeadline: bigint;
	warrantyPeriod: bigint;
	amount: bigint;
	holdBackAmount: bigint;
	arbitrationId: bigint;
	contractHash: `0x${string}`;
	contractURI: string;
	proofOfWorkHash: `0x${string}`;
	proofOfWorkURI: string;
}

function ActionButton({
	label,
	contractId,
	functionName,
	disabled,
}: {
	label: string;
	contractId: bigint;
	functionName: string;
	disabled?: boolean;
}): React.JSX.Element {
	const { writeContract, data: txHash, isPending } = useWriteContract();
	const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

	return (
		<button
			disabled={(disabled ?? false) || isPending || isConfirming}
			onClick={() => {
				writeContract({
					address: TRUSTLEDGER_ADDRESS,
					abi: TRUSTLEDGER_ABI,
					functionName: functionName as never,
					args: [contractId],
				});
			}}
			className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
		>
			{isPending || isConfirming ? "…" : label}
		</button>
	);
}

function RatingForm({ contractId }: { contractId: bigint }): React.JSX.Element {
	const [score, setScore] = useState("80");
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const registryDeployed =
		REPUTATION_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

	function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		const parsed = Number(score);
		if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return;
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "submitRating",
			args: [contractId, parsed],
		});
	}

	if (!registryDeployed) return <></>;

	if (isSuccess) {
		return (
			<p className="text-xs text-green-500 dark:text-green-400">
				Rating submitted.{" "}
				<button
					type="button"
					onClick={reset}
					className="underline text-gray-500 hover:text-gray-900 dark:hover:text-white"
				>
					Submit another
				</button>
			</p>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-2 w-full border-t border-gray-200 dark:border-white/10 pt-3 mt-1"
		>
			<label className="text-xs text-gray-500">Rate counterparty (1-100)</label>
			<div className="flex gap-2 items-center">
				<input
					type="number"
					min={1}
					max={100}
					value={score}
					onChange={(e) => {
						setScore(e.target.value);
					}}
					className="w-20 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				<button
					type="submit"
					disabled={isPending || isConfirming}
					className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
				>
					{isPending || isConfirming ? "…" : "Submit rating"}
				</button>
			</div>
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
		</form>
	);
}

function SubmitWorkForm({ contractId }: { contractId: bigint }): React.JSX.Element {
	const [uri, setUri] = useState("");
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		const trimmed = uri.trim();
		if (trimmed === "") return;
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "submitProofOfWork",
			args: [contractId, keccak256(toBytes(trimmed)), trimmed],
		});
	}

	if (isSuccess)
		return (
			<p className="text-xs text-green-500 dark:text-green-400">
				Work submitted - waiting for client approval.
			</p>
		);

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
			<input
				type="text"
				placeholder="Deliverable URL or IPFS link"
				value={uri}
				onChange={(e) => {
					setUri(e.target.value);
				}}
				required
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
			/>
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming || uri.trim() === ""}
				className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
			>
				{isPending || isConfirming ? "Submitting…" : "Submit Work"}
			</button>
		</form>
	);
}

function ContractCard({
	id,
	contract,
	address,
}: {
	id: bigint;
	contract: EscrowContract;
	address: `0x${string}`;
}): React.JSX.Element {
	const status = contract.status;
	const isClient = contract.client.toLowerCase() === address.toLowerCase();
	const isFreelancer = contract.freelancer.toLowerCase() === address.toLowerCase();
	const now = PAGE_LOAD_TIME_S;

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div>
					<span className="text-xs text-gray-500 font-mono">#{id.toString()}</span>
					<h3 className="font-semibold text-gray-900 dark:text-white mt-0.5">
						{isClient ? "Client" : "Freelancer"} -{" "}
						{isClient
							? `Freelancer: ${formatAddress(contract.freelancer)}`
							: `Client: ${formatAddress(contract.client)}`}
					</h3>
				</div>
				<span
					className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[status] ?? ""}`}
				>
					{STATUS_LABELS[status]}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
				<span className="text-gray-500">Amount</span>
				<span className="text-gray-900 dark:text-white font-medium">
					{formatEther(contract.amount)} ETH
				</span>

				<span className="text-gray-500">Deadline</span>
				<span className="text-gray-900 dark:text-white">
					{formatDeadline(contract.projectDeadline)}
				</span>

				{contract.holdBackBps > 0 && (
					<>
						<span className="text-gray-500">Hold-back</span>
						<span className="text-gray-900 dark:text-white">
							{contract.holdBackBps / 100}%
						</span>
					</>
				)}

				{contract.contractURI !== "" && contract.contractURI !== "ipfs://" && (
					<>
						<span className="text-gray-500">Document</span>
						<a
							href={contract.contractURI.replace("ipfs://", "https://ipfs.io/ipfs/")}
							target="_blank"
							rel="noopener noreferrer"
							className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 truncate underline underline-offset-2"
						>
							View
						</a>
					</>
				)}
			</div>

			{/* Actions */}
			<div className="flex flex-wrap gap-2">
				{/* Freelancer actions */}
				{isFreelancer && status === 0 && (
					<>
						<ActionButton
							label="Accept"
							contractId={id}
							functionName="acceptContract"
						/>
						<ActionButton
							label="Reject"
							contractId={id}
							functionName="rejectContract"
						/>
					</>
				)}
				{/* Client actions */}
				{isClient && status === 2 && (
					<>
						<ActionButton
							label="Approve Work"
							contractId={id}
							functionName="approveWork"
						/>
						<ActionButton label="Dispute" contractId={id} functionName="disputeWork" />
					</>
				)}
				{isClient && status === 1 && now > contract.projectDeadline && (
					<ActionButton
						label="Reclaim (Deadline Missed)"
						contractId={id}
						functionName="claimAfterDeadlineMiss"
					/>
				)}
				{/* Auto-release after acceptance window */}
				{status === 2 &&
					now > contract.acceptanceDeadline &&
					contract.acceptanceDeadline > BigInt(0) && (
						<ActionButton
							label="Release After Window"
							contractId={id}
							functionName="claimAfterAcceptanceWindow"
						/>
					)}
				{/* Warranty claim */}
				{isFreelancer &&
					status === 3 &&
					contract.holdBackAmount > BigInt(0) &&
					now > contract.warrantyDeadline && (
						<ActionButton
							label="Claim Warranty Funds"
							contractId={id}
							functionName="claimWarrantyFunds"
						/>
					)}
				{/* Submit work */}
				{isFreelancer && status === 1 && <SubmitWorkForm contractId={id} />}
			</div>
			{(status === 3 || status === 5) && (isClient || isFreelancer) && (
				<RatingForm contractId={id} />
			)}
			{/* Dispute link */}
			{status === 4 && (
				<Link
					href={`/arbitration/${contract.arbitrationId.toString()}`}
					className="text-xs text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 underline underline-offset-2"
				>
					View Dispute →
				</Link>
			)}
		</div>
	);
}

function ContractList({ address }: { address: `0x${string}` }): React.JSX.Element {
	const { data: nextId } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "nextId",
	});

	const total = Number(nextId ?? BigInt(0));

	if (total === 0) {
		return (
			<div className="text-center py-16 text-gray-500">
				<p>No contracts on-chain yet.</p>
				<Link
					href="/create"
					className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm underline"
				>
					Create the first one
				</Link>
			</div>
		);
	}

	const ids: bigint[] = [];
	for (let i = total - 1; i >= 0; i--) {
		ids.push(BigInt(i));
	}

	return (
		<div className="flex flex-col gap-4">
			{ids.map((id) => (
				<SingleContract key={id.toString()} id={id} address={address} />
			))}
		</div>
	);
}

function SingleContract({
	id,
	address,
}: {
	id: bigint;
	address: `0x${string}`;
}): React.JSX.Element | null {
	const { data: contract, isLoading } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "getContract",
		args: [id],
	});

	if (isLoading || contract === undefined) return null;

	const c = contract;
	const isParticipant =
		c.client.toLowerCase() === address.toLowerCase() ||
		c.freelancer.toLowerCase() === address.toLowerCase();

	if (!isParticipant) return null;

	return <ContractCard id={id} contract={c} address={address} />;
}

export default function DashboardPage(): React.JSX.Element {
	const { address, isConnected } = useAccount();

	if (!isConnected || address === undefined) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-500 dark:text-gray-400 text-lg">
					Connect your wallet to see your contracts.
				</p>
				<ConnectButton />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-6 py-12">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
						Contracts where you are the client or freelancer.
					</p>
				</div>
				<Link
					href="/create"
					className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
				>
					+ New
				</Link>
			</div>

			<ContractList address={address} />
		</div>
	);
}
