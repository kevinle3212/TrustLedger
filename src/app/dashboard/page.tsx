"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useRole } from "@/contexts/RoleContext";
import { ConnectButton } from "@/components/ConnectButton";
import { DecryptDocumentForm } from "@/components/DecryptDocumentForm";
import { formatEther, keccak256, toBytes } from "viem";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { REPUTATION_REGISTRY_ADDRESS, TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { formatAddress, formatDeadline, resolveDocUrl, STATUS_COLORS } from "@/lib/utils";
import { validateRequiredUri, validateScore } from "@/lib/validation";
import type { Contract } from "@/types";
import Link from "next/link";

// Snapshot of "now" taken once at page load.
// Used for deadline comparisons in ContractCard to avoid re-renders on every second.
// These checks are approximate — the contract enforces the real deadline on-chain.
const PAGE_LOAD_TIME_S = BigInt(Math.floor(Date.now() / 1000));

// The EscrowContract struct returned by TrustLedger.getContract() is modelled
// by the shared `Contract` type imported from `@/types`.
// Status values: 0=PENDING 1=ACTIVE 2=SUBMITTED 3=APPROVED 4=DISPUTED 5=RESOLVED 6=CANCELLED

// Generic button that calls a single-argument (contractId) function on TrustLedger.
// Uses wagmi's two-step write pattern:
//   1. useWriteContract() sends the tx and gets a txHash
//   2. useWaitForTransactionReceipt() polls until the tx is mined
// Both pending states disable the button to prevent double-submits.
function ActionButton({
	label,
	contractId,
	functionName,
	disabled,
	value,
}: {
	label: string;
	contractId: bigint;
	functionName: string;
	disabled?: boolean;
	// Optional ETH to send with the call (in wei). Used by acceptContract to fund the escrow.
	value?: bigint;
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
					...(value !== undefined ? { value } : {}),
				});
			}}
			className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
		>
			{isPending || isConfirming ? "…" : label}
		</button>
	);
}

// Inline form for submitting a 1-100 reputation score after contract completion.
// submitRating() is callable by both parties once the contract reaches APPROVED (3) or RESOLVED (5).
// The registry is optional — if it isn't deployed (zero address), the form hides entirely.
function RatingForm({ contractId }: { contractId: bigint }): React.JSX.Element {
	const [score, setScore] = useState("80");
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	// Guard: REPUTATION_REGISTRY_ADDRESS is the zero address when the registry isn't deployed.
	// Comparing to the zero address is cheaper than an extra RPC call.
	const registryDeployed =
		REPUTATION_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

	const scoreError = validateScore(score);

	function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setTouched(true);
		const parsed = Number(score);
		if (scoreError !== undefined || !Number.isInteger(parsed)) return;
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
					onBlur={() => {
						setTouched(true);
					}}
					aria-invalid={touched && scoreError !== undefined}
					className={`w-20 rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
						touched && scoreError !== undefined
							? "border-red-500 dark:border-red-500 focus:ring-red-500"
							: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
					}`}
				/>
				<button
					type="submit"
					disabled={isPending || isConfirming || scoreError !== undefined}
					className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
				>
					{isPending || isConfirming ? "…" : "Submit rating"}
				</button>
			</div>
			{touched && scoreError !== undefined && (
				<p className="text-xs text-red-500 dark:text-red-400">{scoreError}</p>
			)}
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
		</form>
	);
}

// Form for the freelancer to submit a proof-of-work URI (IPFS link or HTTPS URL).
// The URI is also hashed client-side with keccak256 before being sent to the contract.
// The contract stores both: the hash as tamper-proof evidence, the URI for retrieval.
// keccak256(toBytes(uri)) produces a bytes32 commitment — if the URI content changes,
// the on-chain hash no longer matches, proving the deliverable was altered after submission.
function SubmitWorkForm({ contractId }: { contractId: bigint }): React.JSX.Element {
	const [uri, setUri] = useState("");
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const uriError = validateRequiredUri(uri);

	function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setTouched(true);
		const trimmed = uri.trim();
		if (uriError !== undefined) return;
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
				onBlur={() => {
					setTouched(true);
				}}
				required
				aria-invalid={touched && uriError !== undefined}
				className={`rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
					touched && uriError !== undefined
						? "border-red-500 dark:border-red-500 focus:ring-red-500"
						: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
				}`}
			/>
			{touched && uriError !== undefined && (
				<p className="text-xs text-red-500 dark:text-red-400">{uriError}</p>
			)}
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming || uriError !== undefined}
				className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
			>
				{isPending || isConfirming ? "Submitting…" : "Submit Work"}
			</button>
		</form>
	);
}

// Renders one escrow contract with its current state and the actions available to the
// connected wallet. Which buttons appear depends on:
//   - the contract's status (0-6)
//   - whether the connected address is the client or the freelancer
//   - deadline comparisons against PAGE_LOAD_TIME_S
function ContractCard({
	id,
	contract,
	address,
}: {
	id: bigint;
	contract: Contract;
	address: `0x${string}`;
}): React.JSX.Element {
	const status = contract.status;
	const isClient = contract.client.toLowerCase() === address.toLowerCase();
	const isFreelancer = contract.freelancer.toLowerCase() === address.toLowerCase();
	const now = PAGE_LOAD_TIME_S;
	const docUrl = resolveDocUrl(contract.contractURI);
	const deliverableUrl = resolveDocUrl(contract.proofOfWorkURI);
	const [decryptOpen, setDecryptOpen] = useState(false);

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
					{/* Initiator badge so both parties know who created the proposal */}
					<span className="text-xs text-gray-400 dark:text-gray-500">
						{contract.proposedByClient
							? "Client proposed · pre-funded"
							: "Freelancer proposed"}
					</span>
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

				{docUrl !== undefined && (
					<>
						<span className="text-gray-500">Document</span>
						<div className="flex items-center gap-2">
							<a
								href={docUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
							>
								View
							</a>
							<span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
							<button
								type="button"
								onClick={() => {
									setDecryptOpen((o) => !o);
								}}
								className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
							>
								{decryptOpen ? "Hide decrypt" : "Decrypt"}
							</button>
						</div>
					</>
				)}

				{deliverableUrl !== undefined && (
					<>
						<span className="text-gray-500">Deliverable</span>
						<a
							href={deliverableUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 truncate underline underline-offset-2"
						>
							View
						</a>
					</>
				)}
			</div>

			{/* Decrypt panel — full card width, shown when user toggles decrypt */}
			{docUrl !== undefined && decryptOpen && (
				<DecryptDocumentForm
					gatewayUrl={docUrl}
					onClose={() => {
						setDecryptOpen(false);
					}}
				/>
			)}

			{/* Actions — each block is gated by role (isClient/isFreelancer) and status number */}
			<div className="flex flex-wrap gap-2">
				{/* status 0 = PENDING: freelancer-proposed → client accepts (funding) or rejects */}
				{isClient && status === 0 && !contract.proposedByClient && (
					<>
						<ActionButton
							label="Accept & Fund"
							contractId={id}
							functionName="acceptContract"
							value={contract.amount}
						/>
						<ActionButton
							label="Reject"
							contractId={id}
							functionName="rejectContract"
						/>
					</>
				)}
				{/* status 0 = PENDING: client-proposed → freelancer accepts or rejects */}
				{isFreelancer && status === 0 && contract.proposedByClient && (
					<>
						<ActionButton
							label="Accept Offer"
							contractId={id}
							functionName="acceptContractByFreelancer"
						/>
						<ActionButton
							label="Reject Offer"
							contractId={id}
							functionName="rejectContractByFreelancer"
						/>
					</>
				)}
				{/* status 0 = PENDING: freelancer can withdraw their own unfunded proposal */}
				{isFreelancer && status === 0 && !contract.proposedByClient && (
					<ActionButton
						label="Withdraw Proposal"
						contractId={id}
						functionName="cancelProposal"
					/>
				)}
				{/* status 0 = PENDING: client can withdraw their own pre-funded proposal */}
				{isClient && status === 0 && contract.proposedByClient && (
					<ActionButton
						label="Withdraw Offer"
						contractId={id}
						functionName="withdrawClientProposal"
					/>
				)}
				{/* status 2 = SUBMITTED: client reviews the proof-of-work */}
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
				{/* status 1 = ACTIVE: client can reclaim funds if the freelancer missed the deadline */}
				{isClient && status === 1 && now > contract.projectDeadline && (
					<ActionButton
						label="Reclaim (Deadline Missed)"
						contractId={id}
						functionName="claimAfterDeadlineMiss"
					/>
				)}
				{/* status 2 = SUBMITTED: either party can trigger auto-release after acceptance window */}
				{status === 2 &&
					now > contract.acceptanceDeadline &&
					contract.acceptanceDeadline > BigInt(0) && (
						<ActionButton
							label="Release After Window"
							contractId={id}
							functionName="claimAfterAcceptanceWindow"
						/>
					)}
				{/* status 3 = APPROVED: freelancer claims the warranty holdback after the warranty period */}
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
				{/* status 1 = ACTIVE: freelancer submits their deliverable */}
				{isFreelancer && status === 1 && <SubmitWorkForm contractId={id} />}
			</div>
			{/* Rating form available after contract reaches APPROVED (3) or RESOLVED (5) */}
			{(status === 3 || status === 5) && (isClient || isFreelancer) && (
				<RatingForm contractId={id} />
			)}
			{/* status 4 = DISPUTED: link to the arbitration panel */}
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

// Reads nextId from the contract to know the total count, then renders IDs in reverse
// (newest first). Each ID is rendered as a separate SingleContract so reads are parallelised
// by wagmi's internal query deduplication rather than one large multicall.
function ContractList({
	address,
	role,
}: {
	address: `0x${string}`;
	role: "client" | "freelancer";
}): React.JSX.Element {
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
				<SingleContract key={id.toString()} id={id} address={address} role={role} />
			))}
		</div>
	);
}

// Fetches one contract by ID and filters it to the active role view.
// Rendering each contract individually means wagmi can cache and deduplicate reads across
// re-renders — if the same ID is shown on two pages it hits the cache instead of the RPC.
function SingleContract({
	id,
	address,
	role,
}: {
	id: bigint;
	address: `0x${string}`;
	role: "client" | "freelancer";
}): React.JSX.Element | null {
	const { data: contract, isLoading } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "getContract",
		args: [id],
	});

	if (isLoading || contract === undefined) return null;

	const c = contract;
	const addr = address.toLowerCase();
	// Show this contract only if the wallet participates in the active role.
	const matches =
		role === "client"
			? c.client.toLowerCase() === addr
			: c.freelancer.toLowerCase() === addr;

	if (!matches) return null;

	return <ContractCard id={id} contract={c} address={address} />;
}

export default function DashboardPage(): React.JSX.Element {
	const { address, isConnected } = useAccount();
	const { role } = useRole();

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

	const roleLabel = role === "client" ? "Client" : "Freelancer";

	return (
		<div className="max-w-2xl mx-auto px-6 py-12">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
						Contracts where you are the {roleLabel.toLowerCase()}.
					</p>
				</div>
				<Link
					href="/create"
					className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
				>
					+ New
				</Link>
			</div>

			<ContractList address={address} role={role} />
		</div>
	);
}
