"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	useAccount,
	useChainId,
	useReadContract,
	useReadContracts,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { useLocale, useTranslations } from "next-intl";
import { useRole } from "@/contexts/RoleContext";
import { ConnectButton } from "@/components/ConnectButton";
import dynamic from "next/dynamic";

const DecryptDocumentForm = dynamic(
	async () => (await import("@/components/DecryptDocumentForm")).DecryptDocumentForm,
	{ ssr: false },
);
import { keccak256, toBytes } from "viem";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { ERC20_ABI } from "@/lib/erc20Abi";
import { TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import {
	formatAddress,
	formatDeadline,
	formatTokenAmount,
	resolveDocUrl,
	STATUS_COLORS,
} from "@/lib/utils";
import { validateDeliverableUri, validateScore } from "@/lib/validation";
import type { Contract } from "@/types";
import { Link } from "@/i18n/navigation";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Maps numeric status to the ContractStatus message key.
const STATUS_KEYS = [
	"PENDING",
	"ACTIVE",
	"SUBMITTED",
	"APPROVED",
	"DISPUTED",
	"RESOLVED",
	"CANCELLED",
] as const;

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
			type="button"
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

// Button that handles the two-step approve → fund flow for ERC-20 (USDC) escrow contracts.
// Step 1: approve the TrustLedger contract to spend the token amount.
// Step 2: call the funding function (acceptContract or fundContractByClient) after approval confirms.
function TokenFundButton({
	label,
	contractId,
	functionName,
	tokenAddress,
	amount,
	userAddress,
	disabled,
}: {
	label: string;
	contractId: bigint;
	functionName: string;
	tokenAddress: `0x${string}`;
	amount: bigint;
	userAddress: `0x${string}`;
	disabled?: boolean;
}): React.JSX.Element {
	const t = useTranslations("Dashboard");
	// Ref instead of state: avoids calling setState inside a useEffect (cascading renders).
	const stepRef = useRef<"idle" | "approving">("idle");

	const {
		writeContract: writeApprove,
		data: approveTxHash,
		isPending: approveIsPending,
	} = useWriteContract();
	const { isLoading: approveConfirming, isSuccess: approveSuccess } =
		useWaitForTransactionReceipt({ hash: approveTxHash });

	const {
		writeContract: writeFund,
		data: fundTxHash,
		isPending: fundIsPending,
	} = useWriteContract();
	const { isLoading: fundConfirming, isSuccess: fundSuccess } = useWaitForTransactionReceipt({
		hash: fundTxHash,
	});

	const { data: allowance } = useReadContract({
		address: tokenAddress,
		abi: ERC20_ABI,
		functionName: "allowance",
		args: [userAddress, TRUSTLEDGER_ADDRESS],
	});

	// After approve confirms, auto-trigger the fund tx.
	useEffect(() => {
		if (approveSuccess && stepRef.current === "approving") {
			stepRef.current = "idle";
			writeFund({
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: functionName as never,
				args: [contractId],
			});
		}
	}, [approveSuccess, contractId, functionName, writeFund]);

	if (fundSuccess) {
		return (
			<span className="text-xs text-green-500 dark:text-green-400 px-3 py-1.5">
				{t("funded")}
			</span>
		);
	}

	const busy = approveIsPending || approveConfirming || fundIsPending || fundConfirming;

	function handleClick(): void {
		const hasAllowance = allowance !== undefined && allowance >= amount;
		if (hasAllowance) {
			writeFund({
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: functionName as never,
				args: [contractId],
			});
		} else {
			stepRef.current = "approving";
			writeApprove({
				address: tokenAddress,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [TRUSTLEDGER_ADDRESS, amount],
			});
		}
	}

	const buttonLabel = busy
		? approveIsPending || approveConfirming
			? t("approving")
			: t("funding")
		: label;

	return (
		<button
			type="button"
			disabled={(disabled ?? false) || busy}
			onClick={handleClick}
			className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
		>
			{buttonLabel}
		</button>
	);
}

// Inline form for submitting a 1-100 reputation score after contract completion.
// submitRating() is callable by both parties once the contract reaches APPROVED (3) or RESOLVED (5).
function RatingForm({ contractId }: { contractId: bigint }): React.JSX.Element {
	const t = useTranslations("Dashboard");
	const [score, setScore] = useState("80");
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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

	if (isSuccess) {
		return (
			<p className="text-xs text-green-500 dark:text-green-400">
				{t("ratingSubmitted")}{" "}
				<button
					type="button"
					onClick={reset}
					className="underline text-gray-500 hover:text-gray-900 dark:hover:text-white"
				>
					{t("submitAnother")}
				</button>
			</p>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-2 w-full border-t border-gray-200 dark:border-white/10 pt-3 mt-1"
		>
			<label htmlFor="rate-score" className="text-xs text-gray-500">
				{t("rateCounterparty")}
			</label>
			<div className="flex gap-2 items-center">
				<input
					id="rate-score"
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
					{isPending || isConfirming ? "…" : t("submitRating")}
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
	const t = useTranslations("Dashboard");
	const [uri, setUri] = useState("");
	// touched becomes true as soon as the user types anything or blurs the field,
	// so the error message appears in real time once they start interacting.
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const uriError = validateDeliverableUri(uri);
	const showError = touched && uriError !== undefined;

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
		return <p className="text-xs text-green-500 dark:text-green-400">{t("workSubmitted")}</p>;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
			{/* Error message appears at the top of the form as soon as the input is
			    invalid, so the user sees feedback in real time while typing. */}
			{showError && (
				<p role="alert" className="text-xs text-red-500 dark:text-red-400">
					{uriError}
				</p>
			)}
			<input
				aria-label={t("deliverableUrl")}
				type="url"
				placeholder="https://… or ipfs://… or Qm… / baf…"
				value={uri}
				onChange={(e) => {
					setUri(e.target.value);
					setTouched(true);
				}}
				onBlur={() => {
					setTouched(true);
				}}
				aria-invalid={showError}
				aria-describedby={showError ? "uri-error" : undefined}
				className={`rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition ${
					showError
						? "border-red-500 dark:border-red-500 focus:ring-red-500"
						: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
				}`}
			/>
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
				{isPending || isConfirming ? t("submitting") : t("submitWork")}
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
	const t = useTranslations("Dashboard");
	const tStatus = useTranslations("ContractStatus");
	const locale = useLocale();
	const chainId = useChainId();
	const status = contract.status;
	const isClient = contract.client.toLowerCase() === address.toLowerCase();
	const isFreelancer = contract.freelancer.toLowerCase() === address.toLowerCase();
	const now = PAGE_LOAD_TIME_S;
	const docUrl = resolveDocUrl(contract.contractURI);
	const deliverableUrl = resolveDocUrl(contract.proofOfWorkURI);
	const [decryptOpen, setDecryptOpen] = useState(false);
	const isToken = contract.token !== ZERO_ADDRESS;
	const formattedAmount = formatTokenAmount(contract.amount, contract.token, locale);
	void chainId; // used implicitly via TokenFundButton

	const statusLabel = tStatus(STATUS_KEYS[status] ?? "PENDING");

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex items-start justify-between gap-2">
				<div>
					<span className="text-xs text-gray-500 font-mono">#{id.toString()}</span>
					<h3 className="font-semibold text-gray-900 dark:text-white mt-0.5">
						{isClient ? t("isClient") : t("isFreelancer")} -{" "}
						{isClient
							? `${t("isFreelancer")}: ${formatAddress(contract.freelancer)}`
							: `${t("isClient")}: ${formatAddress(contract.client)}`}
					</h3>
					{/* Initiator badge so both parties know who created the proposal */}
					<span className="text-xs text-gray-400 dark:text-gray-500">
						{contract.proposedByClient
							? t("clientProposedPrefunded")
							: t("freelancerProposed")}
					</span>
				</div>
				<span
					className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[status] ?? ""}`}
				>
					{statusLabel}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
				<span className="text-gray-500">{t("amount")}</span>
				<span className="text-gray-900 dark:text-white font-medium">{formattedAmount}</span>

				<span className="text-gray-500">{t("deadline")}</span>
				<span className="text-gray-900 dark:text-white">
					{formatDeadline(contract.projectDeadline, locale)}
				</span>

				{contract.holdBackBps > 0 && (
					<>
						<span className="text-gray-500">{t("holdBack")}</span>
						<span className="text-gray-900 dark:text-white">
							{contract.holdBackBps / 100}%
						</span>
					</>
				)}

				{docUrl !== undefined && (
					<>
						<span className="text-gray-500">{t("document")}</span>
						<div className="flex items-center gap-2">
							<a
								href={docUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
							>
								{t("view")}
							</a>
							<span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
							<button
								type="button"
								onClick={() => {
									setDecryptOpen((o) => !o);
								}}
								className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
							>
								{decryptOpen ? t("hideDecrypt") : t("decrypt")}
							</button>
						</div>
					</>
				)}

				{deliverableUrl !== undefined && (
					<>
						<span className="text-gray-500">{t("deliverable")}</span>
						<a
							href={deliverableUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 truncate underline underline-offset-2"
						>
							{t("view")}
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
						{isToken ? (
							<TokenFundButton
								label={t("approveFundUsdc")}
								contractId={id}
								functionName="acceptContract"
								tokenAddress={contract.token}
								amount={contract.amount}
								userAddress={address}
							/>
						) : (
							<ActionButton
								label={t("acceptFund")}
								contractId={id}
								functionName="acceptContract"
								value={contract.amount}
							/>
						)}
						<ActionButton
							label={t("reject")}
							contractId={id}
							functionName="rejectContract"
						/>
					</>
				)}
				{/* status 0 = PENDING: client-proposed, freelancer accepted → client funds */}
				{isClient &&
					status === 0 &&
					contract.proposedByClient &&
					contract.freelancerAccepted &&
					(isToken ? (
						<TokenFundButton
							label={t("approveFundUsdc")}
							contractId={id}
							functionName="fundContractByClient"
							tokenAddress={contract.token}
							amount={contract.amount}
							userAddress={address}
						/>
					) : (
						<ActionButton
							label={t("fundContract")}
							contractId={id}
							functionName="fundContractByClient"
							value={contract.amount}
						/>
					))}
				{/* status 0 = PENDING: client-proposed → freelancer accepts or rejects */}
				{isFreelancer && status === 0 && contract.proposedByClient && (
					<>
						<ActionButton
							label={t("acceptOffer")}
							contractId={id}
							functionName="acceptContractByFreelancer"
						/>
						<ActionButton
							label={t("rejectOffer")}
							contractId={id}
							functionName="rejectContractByFreelancer"
						/>
					</>
				)}
				{/* status 0 = PENDING: freelancer can withdraw their own unfunded proposal */}
				{isFreelancer && status === 0 && !contract.proposedByClient && (
					<ActionButton
						label={t("withdrawProposal")}
						contractId={id}
						functionName="cancelProposal"
					/>
				)}
				{/* status 0 = PENDING: client can withdraw their own unfunded proposal (before freelancer accepts or after) */}
				{isClient &&
					status === 0 &&
					contract.proposedByClient &&
					!contract.freelancerAccepted && (
						<ActionButton
							label={t("withdrawOffer")}
							contractId={id}
							functionName="withdrawClientProposal"
						/>
					)}
				{/* status 2 = SUBMITTED: client reviews the proof-of-work */}
				{isClient && status === 2 && (
					<>
						<ActionButton
							label={t("approveWork")}
							contractId={id}
							functionName="approveWork"
						/>
						<ActionButton
							label={t("dispute")}
							contractId={id}
							functionName="disputeWork"
						/>
					</>
				)}
				{/* status 1 = ACTIVE: client can reclaim funds if the freelancer missed the deadline */}
				{isClient && status === 1 && now > contract.projectDeadline && (
					<ActionButton
						label={t("reclaimDeadline")}
						contractId={id}
						functionName="claimAfterDeadlineMiss"
					/>
				)}
				{/* status 2 = SUBMITTED: either party can trigger auto-release after acceptance window */}
				{status === 2 &&
					now > contract.acceptanceDeadline &&
					contract.acceptanceDeadline > BigInt(0) && (
						<ActionButton
							label={t("releaseAfterWindow")}
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
							label={t("claimWarrantyFunds")}
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
					{t("viewDispute")}
				</Link>
			)}
		</div>
	);
}

/**
 * Summary stat strip shown above the contract list.
 *
 * Reads all on-chain contracts via a single `useReadContracts` batch call (wagmi
 * deduplicates with the individual reads in `ContractList`, so there is no extra
 * RPC cost), filters to the current wallet + role, and displays a count chip for
 * every status that has at least one contract. "Total" is always shown.
 */
function SummaryBanner({
	address,
	role,
}: {
	address: `0x${string}`;
	role: "client" | "freelancer";
}): React.JSX.Element | null {
	const t = useTranslations("Dashboard");
	const { data: nextId } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "nextId",
	});

	const total = Number(nextId ?? BigInt(0));

	const contractConfigs = useMemo(
		() =>
			Array.from({ length: total }, (_, i) => ({
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: "getContract" as const,
				args: [BigInt(i)] as [bigint],
			})),
		[total],
	);

	const { data: allContracts } = useReadContracts({ contracts: contractConfigs });

	const stats = useMemo(() => {
		if (allContracts === undefined || allContracts.length === 0) return null;
		const addr = address.toLowerCase();
		const mine = allContracts
			.map((r) => (r.status === "success" ? r.result : undefined))
			.filter((c): c is Contract => {
				if (c === undefined) return false;
				return role === "client"
					? c.client.toLowerCase() === addr
					: c.freelancer.toLowerCase() === addr;
			});

		const byStatus: Record<number, number> = {};
		for (const c of mine) {
			byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
		}
		return { count: mine.length, byStatus };
	}, [allContracts, address, role]);

	if (stats === null || stats.count === 0) return null;

	// Use a stable non-translated key alongside the translated label so the
	// "Total" filter and the React key prop don't depend on locale.
	const chips: { key: string; label: string; value: number; color: string }[] = [
		{
			key: "total",
			label: t("total"),
			value: stats.count,
			color: "text-gray-900 dark:text-white",
		},
		{
			key: "pending",
			label: t("pending"),
			value: stats.byStatus[0] ?? 0,
			color: "text-yellow-600 dark:text-yellow-400",
		},
		{
			key: "active",
			label: t("active"),
			value: stats.byStatus[1] ?? 0,
			color: "text-green-600 dark:text-green-400",
		},
		{
			key: "submitted",
			label: t("submitted"),
			value: stats.byStatus[2] ?? 0,
			color: "text-blue-600 dark:text-blue-400",
		},
		{
			key: "approved",
			label: t("approved"),
			value: stats.byStatus[3] ?? 0,
			color: "text-indigo-600 dark:text-indigo-400",
		},
		{
			key: "disputed",
			label: t("disputed"),
			value: stats.byStatus[4] ?? 0,
			color: "text-red-600 dark:text-red-400",
		},
		{
			key: "resolved",
			label: t("resolved"),
			value: stats.byStatus[5] ?? 0,
			color: "text-purple-600 dark:text-purple-400",
		},
		{
			key: "cancelled",
			label: t("cancelled"),
			value: stats.byStatus[6] ?? 0,
			color: "text-gray-500 dark:text-gray-400",
		},
	].filter((c) => c.key === "total" || c.value > 0);

	return (
		<section
			aria-label={t("summaryAriaLabel")}
			className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
		>
			{chips.map((c) => (
				<div
					key={c.key}
					className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-4 py-3"
				>
					<p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
						{c.label}
					</p>
					<p
						className={`text-2xl font-bold mt-0.5 ${c.color}`}
						aria-label={`${String(c.value)} ${c.label.toLowerCase()}`}
					>
						{c.value}
					</p>
				</div>
			))}
		</section>
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
	const t = useTranslations("Dashboard");
	const { data: nextId } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "nextId",
	});

	const total = Number(nextId ?? BigInt(0));

	if (total === 0) {
		return (
			<div className="text-center py-16 text-gray-500">
				<p>{t("noContracts")}</p>
				<Link
					href="/create"
					className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm underline"
				>
					{t("createFirst")}
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
		role === "client" ? c.client.toLowerCase() === addr : c.freelancer.toLowerCase() === addr;

	if (!matches) return null;

	return <ContractCard id={id} contract={c} address={address} />;
}

export default function DashboardPage(): React.JSX.Element {
	const t = useTranslations("Dashboard");
	const { address, isConnected } = useAccount();
	const { role } = useRole();

	if (!isConnected || address === undefined) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-500 dark:text-gray-400 text-lg">{t("connectWallet")}</p>
				<ConnectButton />
			</div>
		);
	}

	const roleLabel = role === "client" ? t("isClient") : t("isFreelancer");

	return (
		<div className="max-w-2xl mx-auto px-6 py-12">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold">{t("title")}</h1>
					<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
						{t("contractsWhere", { role: roleLabel.toLowerCase() })}
					</p>
				</div>
				<Link
					href="/create"
					className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
				>
					{t("newButton")}
				</Link>
			</div>

			<SummaryBanner address={address} role={role} />
			<ContractList address={address} role={role} />
		</div>
	);
}
