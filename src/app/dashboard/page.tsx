"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, keccak256, toBytes } from "viem";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { REPUTATION_REGISTRY_ADDRESS, TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { formatAddress, formatDeadline, resolveDocUrl, STATUS_COLORS } from "@/lib/utils";
import { decryptFile } from "@/lib/encryption";
import Link from "next/link";

// Snapshot of "now" taken once at page load.
// Used for deadline comparisons in ContractCard to avoid re-renders on every second.
// These checks are approximate — the contract enforces the real deadline on-chain.
const PAGE_LOAD_TIME_S = BigInt(Math.floor(Date.now() / 1000));

// Mirror of the EscrowContract struct returned by TrustLedger.getContract().
// Status values: 0=PENDING 1=ACTIVE 2=SUBMITTED 3=APPROVED 4=DISPUTED 5=RESOLVED 6=CANCELLED
interface EscrowContract {
	client: `0x${string}`;
	arbitrationFeeBps: number; // fee taken for arbitration, in basis points (100 bps = 1%)
	holdBackBps: number; // warranty holdback portion, in basis points
	status: number;
	freelancer: `0x${string}`;
	warrantyDeadline: bigint; // unix timestamp after which freelancer can claim holdback
	projectDeadline: bigint; // unix timestamp for the buffered project deadline
	acceptanceWindow: bigint; // seconds the client has to approve after work is submitted
	acceptanceDeadline: bigint; // absolute unix timestamp when acceptance window closes
	warrantyPeriod: bigint; // duration in seconds of the warranty holdback period
	amount: bigint; // total escrowed amount in wei
	holdBackAmount: bigint; // portion withheld for warranty (subset of amount)
	arbitrationId: bigint; // ID in the Arbitration contract (0 if no dispute)
	contractHash: `0x${string}`; // keccak256 of the off-chain contract document
	contractURI: string; // IPFS or HTTPS URI to the contract document
	proofOfWorkHash: `0x${string}`; // keccak256 of the deliverable artifact
	proofOfWorkURI: string; // IPFS or HTTPS URI to the deliverable
}

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

// Inline form for submitting a 1-100 reputation score after contract completion.
// submitRating() is callable by both parties once the contract reaches APPROVED (3) or RESOLVED (5).
// The registry is optional — if it isn't deployed (zero address), the form hides entirely.
function RatingForm({ contractId }: { contractId: bigint }): React.JSX.Element {
	const [score, setScore] = useState("80");
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	// Guard: REPUTATION_REGISTRY_ADDRESS is the zero address when the registry isn't deployed.
	// Comparing to the zero address is cheaper than an extra RPC call.
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

// Form for the freelancer to submit a proof-of-work URI (IPFS link or HTTPS URL).
// The URI is also hashed client-side with keccak256 before being sent to the contract.
// The contract stores both: the hash as tamper-proof evidence, the URI for retrieval.
// keccak256(toBytes(uri)) produces a bytes32 commitment — if the URI content changes,
// the on-chain hash no longer matches, proving the deliverable was altered after submission.
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

type DecryptMode = "fetch" | "paste";
type DecryptStatus = "idle" | "working" | "done" | "error";

/// Full-width decrypt panel for AES-256-GCM encrypted IPFS documents.
/// Rendered by ContractCard below the info grid when the user toggles decrypt open.
/// Supports fetching the bundle from a gateway URL or accepting a pasted JSON bundle.
function DecryptDocumentForm({
	gatewayUrl,
	onClose,
}: {
	gatewayUrl: string;
	onClose: () => void;
}): React.JSX.Element {
	const [mode, setMode] = useState<DecryptMode>("fetch");
	const [pastedBundle, setPastedBundle] = useState("");
	const [passphrase, setPassphrase] = useState("");
	const [filename, setFilename] = useState("decrypted-document");
	const [status, setStatus] = useState<DecryptStatus>("idle");
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	async function handleDecrypt(): Promise<void> {
		setStatus("working");
		setErrorMsg(null);
		try {
			let buffer: ArrayBuffer;
			if (mode === "fetch") {
				const res = await fetch(gatewayUrl);
				if (!res.ok)
					throw new Error(`Gateway returned ${String(res.status)} ${res.statusText}`);
				buffer = await res.arrayBuffer();
			} else {
				buffer = new TextEncoder().encode(pastedBundle.trim()).buffer;
			}
			const decrypted = await decryptFile(buffer, passphrase);
			// Trigger a browser download by creating a temporary <a> element, clicking it,
			// and immediately revoking the object URL to free memory.
			const url = URL.createObjectURL(new Blob([decrypted]));
			const a = document.createElement("a");
			a.href = url;
			a.download = filename.trim() !== "" ? filename.trim() : "decrypted-document";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			setStatus("done");
		} catch (err) {
			// AES-GCM throws OperationError when the passphrase is wrong or ciphertext is tampered.
			const friendly =
				err instanceof DOMException && err.name === "OperationError"
					? "Decryption failed — wrong passphrase or corrupted bundle."
					: err instanceof Error
						? err.message
						: String(err);
			setErrorMsg(friendly);
			setStatus("error");
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-gray-700 dark:text-gray-200">
					Decrypt AES-256-GCM document
				</span>
				<button
					type="button"
					onClick={onClose}
					className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
				>
					✕
				</button>
			</div>

			{/* Source mode toggle: "fetch" loads from the IPFS gateway URI; "paste" accepts a copied JSON bundle */}
			<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1 self-start">
				{(["fetch", "paste"] as DecryptMode[]).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => {
							setMode(m);
						}}
						className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
							mode === m
								? "bg-indigo-600 text-white"
								: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
						}`}
					>
						{m === "fetch" ? "Fetch from URI" : "Paste bundle"}
					</button>
				))}
			</div>

			{mode === "fetch" ? (
				<p className="text-xs text-gray-500 break-all">
					Will fetch:{" "}
					<span className="font-mono text-gray-600 dark:text-gray-400">{gatewayUrl}</span>
				</p>
			) : (
				<textarea
					rows={4}
					placeholder={'{"v":1,"alg":"AES-256-GCM",…}'}
					value={pastedBundle}
					onChange={(e) => {
						setPastedBundle(e.target.value);
					}}
					className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
				/>
			)}

			<input
				type="password"
				placeholder="Passphrase"
				value={passphrase}
				onChange={(e) => {
					setPassphrase(e.target.value);
				}}
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
			/>

			<input
				type="text"
				placeholder="Output filename (e.g. contract.pdf)"
				value={filename}
				onChange={(e) => {
					setFilename(e.target.value);
				}}
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
			/>

			{status === "done" ? (
				<p className="text-xs text-green-500 dark:text-green-400">
					✓ File downloaded.{" "}
					<button
						type="button"
						onClick={() => {
							setStatus("idle");
							setErrorMsg(null);
							setPassphrase("");
						}}
						className="underline text-gray-500 hover:text-gray-900 dark:hover:text-white"
					>
						Decrypt another
					</button>
				</p>
			) : (
				<button
					type="button"
					onClick={() => {
						void handleDecrypt();
					}}
					disabled={
						status === "working" ||
						passphrase === "" ||
						(mode === "paste" && pastedBundle.trim() === "")
					}
					className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
				>
					{status === "working" ? "Decrypting…" : "Decrypt & Download"}
				</button>
			)}

			{status === "error" && errorMsg !== null && (
				<p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
					{errorMsg}
				</p>
			)}
		</div>
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
	contract: EscrowContract;
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
				{/* status 0 = PENDING: freelancer can accept or reject */}
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

// Fetches one contract by ID and filters it out if the connected wallet isn't a participant.
// Rendering each contract individually means wagmi can cache and deduplicate reads across
// re-renders — if the same ID is shown on two pages it hits the cache instead of the RPC.
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
	// Only show contracts where the connected wallet is the client or the freelancer.
	// toLowerCase() normalises checksum addresses so the comparison is case-insensitive.
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
