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
import { WalletRequiredPage } from "@/components/WalletRequiredPage";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";

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
import {
	markDashboardVisitedPreference,
	readDashboardVisitedPreference,
} from "@/lib/accountPreferences";
import { useVisibleTimestamp } from "@/hooks/useVisibleTimestamp";

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

// The EscrowContract struct returned by TrustLedger.getContract() is modelled
// by the shared `Contract` type imported from `@/types`.
// Status values: 0=PENDING 1=ACTIVE 2=SUBMITTED 3=APPROVED 4=DISPUTED 5=RESOLVED 6=CANCELLED

function useNowSeconds(): bigint {
	return BigInt(Math.floor(useVisibleTimestamp(1000) / 1000));
}

function formatCountdownParts(
	target: bigint,
	now: bigint,
): {
	readonly label: string;
	readonly urgent: boolean;
} {
	const delta = Number(target > now ? target - now : now - target);
	const days = Math.floor(delta / 86_400);
	const hours = Math.floor((delta % 86_400) / 3_600);
	const minutes = Math.floor((delta % 3_600) / 60);
	const seconds = delta % 60;
	const dayText = days.toString();
	const hourText = hours.toString();
	const minuteText = minutes.toString();
	const secondText = seconds.toString();
	const label =
		days > 0
			? `${dayText}d ${hourText}h ${minuteText}m`
			: hours > 0
				? `${hourText}h ${minuteText}m ${secondText}s`
				: `${minuteText}m ${secondText}s`;
	return { label, urgent: target > now && delta <= 86_400 };
}

function nextStageDeadline(
	contract: Contract,
	t: ReturnType<typeof useTranslations>,
): {
	readonly title: string;
	readonly target: bigint;
	readonly detail: string;
} | null {
	if (contract.status === 1 && contract.projectDeadline > BigInt(0)) {
		return {
			title: t("countdownProjectTitle"),
			target: contract.projectDeadline,
			detail: t("countdownProjectDetail"),
		};
	}
	if (contract.status === 2 && contract.acceptanceDeadline > BigInt(0)) {
		return {
			title: t("countdownAcceptanceTitle"),
			target: contract.acceptanceDeadline,
			detail: t("countdownAcceptanceDetail"),
		};
	}
	if (
		contract.status === 3 &&
		contract.holdBackAmount > BigInt(0) &&
		contract.warrantyDeadline > BigInt(0)
	) {
		return {
			title: t("countdownWarrantyTitle"),
			target: contract.warrantyDeadline,
			detail: t("countdownWarrantyDetail"),
		};
	}
	return null;
}

function StageCountdown({
	contract,
	now,
}: {
	readonly contract: Contract;
	readonly now: bigint;
}): React.JSX.Element | null {
	const t = useTranslations("Dashboard");
	const locale = useLocale();
	const deadline = nextStageDeadline(contract, t);
	if (deadline === null) return null;

	const expired = now >= deadline.target;
	const countdown = formatCountdownParts(deadline.target, now);

	return (
		<div
			className={`rounded-xl border p-4 ${
				expired
					? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
					: countdown.urgent
						? "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-100"
						: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
			}`}
			aria-live="polite"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-semibold">{deadline.title}</p>
					<p className="mt-1 text-xs leading-5 opacity-80">
						{deadline.detail} {formatDeadline(deadline.target, locale)}
					</p>
				</div>
				<div className="min-w-36 rounded-lg border border-current/15 bg-white/55 px-3 py-2 text-right font-mono dark:bg-gray-950/35">
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] opacity-70">
						{expired ? t("countdownSince") : t("countdownRemaining")}
					</p>
					<p className="mt-1 text-lg font-bold tabular-nums">{countdown.label}</p>
				</div>
			</div>
		</div>
	);
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
			aria-busy={isPending || isConfirming}
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
			className="tl-button-motion rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
		>
			{isPending ? "Pending..." : isConfirming ? "Confirming..." : label}
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
			aria-busy={busy}
			disabled={(disabled ?? false) || busy}
			onClick={handleClick}
			className="tl-button-motion rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
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
					aria-busy={isPending || isConfirming}
					disabled={isPending || isConfirming || scoreError !== undefined}
					className="tl-button-motion rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{isPending ? "Pending..." : isConfirming ? "Confirming..." : t("submitRating")}
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
				placeholder={t("deliverableUrlPlaceholder")}
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
				aria-busy={isPending || isConfirming}
				disabled={isPending || isConfirming || uriError !== undefined}
				className="tl-button-motion rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
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
	const now = useNowSeconds();
	const docUrl = resolveDocUrl(contract.contractURI);
	const deliverableUrl = resolveDocUrl(contract.proofOfWorkURI);
	const [decryptOpen, setDecryptOpen] = useState(false);
	const isToken = contract.token !== ZERO_ADDRESS;
	const formattedAmount = formatTokenAmount(contract.amount, contract.token, locale);
	void chainId; // used implicitly via TokenFundButton
	const { data: summaryText, isLoading: summaryLoading } = useQuery({
		queryKey: ["contract-summary", id.toString()],
		queryFn: async ({ signal }) => {
			const response = await fetch(`/api/contract/${id.toString()}/summary`, { signal });
			if (!response.ok) throw new Error("Summary unavailable");
			const payload = (await response.json()) as { summary?: unknown };
			if (typeof payload.summary !== "string" || payload.summary === "") {
				throw new Error("Summary unavailable");
			}
			return payload.summary;
		},
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	const statusLabel = tStatus(STATUS_KEYS[status] ?? "PENDING");

	return (
		<div className="tl-motion-card flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
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
					className={`tl-status-badge ${status === 1 ? "tl-status-badge--active" : ""} w-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}
				>
					{statusLabel}
				</span>
			</div>

			<div className="tl-kv-grid text-sm">
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

			<StageCountdown contract={contract} now={now} />

			<div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-400/20 dark:bg-indigo-400/10">
				<p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-200">
					{t("aiSummary")}
				</p>
				<p className="mt-2 text-sm leading-6 text-indigo-950 dark:text-indigo-50">
					{summaryLoading
						? t("aiSummaryLoading")
						: (summaryText ??
							"Summary is temporarily unavailable. Contract actions and on-chain status are still available below.")}
				</p>
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
			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
					className="tl-motion-card rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
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

function ExampleContractPreview(): React.JSX.Element {
	const t = useTranslations("Dashboard");

	return (
		<div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<p className="font-mono text-xs text-gray-500">#12</p>
					<h3 className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
						{t("exampleTitle")}
					</h3>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{t("exampleSubtitle")}
					</p>
				</div>
				<span className="tl-status-badge tl-status-badge--active shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
					{t("active")}
				</span>
			</div>
			<div className="tl-kv-grid mt-4 text-sm">
				<span className="text-gray-500 dark:text-gray-400">{t("amount")}</span>
				<span className="font-medium text-gray-900 dark:text-white">
					{t("exampleAmount")}
				</span>
				<span className="text-gray-500 dark:text-gray-400">{t("deadline")}</span>
				<span className="text-gray-900 dark:text-white">{t("exampleDeadline")}</span>
				<span className="text-gray-500 dark:text-gray-400">{t("document")}</span>
				<span className="text-indigo-600 dark:text-indigo-400">{t("view")}</span>
			</div>
		</div>
	);
}

function DashboardEmptyState({
	role,
	showIntroActions,
	onShowHelp,
	onSkipIntro,
}: {
	role: "client" | "freelancer";
	showIntroActions: boolean;
	onShowHelp: () => void;
	onSkipIntro: () => void;
}): React.JSX.Element {
	const t = useTranslations("Dashboard");
	const roleLabel = role === "client" ? t("isClient") : t("isFreelancer");

	return (
		<section className="tl-empty-panel rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5 sm:p-8">
			<div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-center">
				<div className="max-w-xl">
					<h2 className="text-2xl font-semibold tracking-[-0.015em] text-gray-900 dark:text-white">
						{t("emptyTitle", { role: roleLabel })}
					</h2>
					<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("emptyDescription")}
					</p>
					{showIntroActions && (
						<>
							<div className="mt-6 flex flex-col gap-3 sm:flex-row">
								<Link
									href="/create"
									className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-gray-950"
								>
									{t("createFirst")}
								</Link>
								<button
									type="button"
									onClick={onShowHelp}
									className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white dark:focus-visible:ring-offset-gray-950"
								>
									{t("showWalkthrough")}
								</button>
								<button
									type="button"
									onClick={onSkipIntro}
									className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 hover:border-amber-300 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
								>
									{t("skipIntro")}
								</button>
							</div>
							<ol className="mt-8 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
								{[
									t("emptyStepCreate"),
									t("emptyStepFund"),
									t("emptyStepReview"),
								].map((step, index) => (
									<li key={step} className="flex gap-3">
										<span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-semibold text-gray-700 dark:border-white/15 dark:bg-white/5 dark:text-gray-200">
											{index + 1}
										</span>
										<span>{step}</span>
									</li>
								))}
							</ol>
						</>
					)}
				</div>
				<ExampleContractPreview />
			</div>
		</section>
	);
}

function DashboardHelpButton({ onClick }: { onClick: () => void }): React.JSX.Element {
	const t = useTranslations("Dashboard");

	return (
		<div className="fixed bottom-5 right-5 z-40">
			<button
				type="button"
				onClick={onClick}
				aria-label={t("helpAriaLabel")}
				className="tl-button-motion group relative flex size-11 items-center justify-center rounded-full border border-gray-200 bg-white text-lg font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
			>
				?
				<span
					role="tooltip"
					className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:border-white/10 dark:bg-gray-900 dark:text-gray-200"
				>
					{t("helpTooltip")}
				</span>
			</button>
		</div>
	);
}

function DashboardWalkthrough({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}): React.JSX.Element | null {
	const t = useTranslations("Dashboard");
	const [activeStep, setActiveStep] = useState(0);
	const steps = [
		{
			title: t("walkthroughStepCreateTitle"),
			body: t("walkthroughStepCreateBody"),
			tasks: [
				t("walkthroughStepCreateTaskRole"),
				t("walkthroughStepCreateTaskDetails"),
				t("walkthroughStepCreateTaskPreview"),
			],
		},
		{
			title: t("walkthroughStepTrackTitle"),
			body: t("walkthroughStepTrackBody"),
			tasks: [
				t("walkthroughStepTrackTaskState"),
				t("walkthroughStepTrackTaskDocument"),
				t("walkthroughStepTrackTaskActions"),
			],
		},
		{
			title: t("walkthroughStepResolveTitle"),
			body: t("walkthroughStepResolveBody"),
			tasks: [
				t("walkthroughStepResolveTaskEvidence"),
				t("walkthroughStepResolveTaskJurors"),
				t("walkthroughStepResolveTaskPayouts"),
			],
		},
	] as const;
	const active = steps[activeStep] ?? steps[0];

	if (!open) return null;

	return (
		<dialog
			open
			aria-labelledby="dashboard-walkthrough-title"
			className="fixed inset-0 z-50 h-full max-h-none w-full max-w-none bg-gray-950/45 p-0"
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			<div className="flex min-h-full items-end px-4 py-4 sm:items-center sm:justify-center">
				<section className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 dark:border-white/10 dark:bg-gray-950 dark:text-white sm:p-8">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="max-w-2xl">
							<h2
								id="dashboard-walkthrough-title"
								className="text-2xl font-semibold tracking-[-0.015em]"
							>
								{t("walkthroughTitle")}
							</h2>
							<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
								{t("walkthroughIntro")}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
						>
							{t("skip")}
						</button>
					</div>
					<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
						<div className="space-y-4">
							<div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-400/30 dark:bg-indigo-400/10">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-200">
									{t("walkthroughStepCounter", {
										current: activeStep + 1,
										total: steps.length,
									})}
								</p>
								<h3 className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">
									{active.title}
								</h3>
								<p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
									{active.body}
								</p>
								<ul className="mt-4 grid gap-2">
									{active.tasks.map((task) => (
										<li
											key={task}
											className="flex gap-2 rounded-lg border border-white/70 bg-white/70 p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-gray-950/50 dark:text-gray-200"
										>
											<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
												✓
											</span>
											{task}
										</li>
									))}
								</ul>
							</div>
							<div className="grid grid-cols-3 gap-2">
								{steps.map((step, index) => (
									<button
										key={step.title}
										type="button"
										onClick={() => {
											setActiveStep(index);
										}}
										className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
											activeStep === index
												? "border-indigo-200 bg-indigo-600 text-white"
												: "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300"
										}`}
									>
										{t("walkthroughStepTab", { step: index + 1 })}
									</button>
								))}
							</div>
						</div>
						<ExampleContractPreview />
					</div>
					<div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-white/10 sm:flex-row sm:justify-end">
						<button
							type="button"
							onClick={() => {
								setActiveStep((current) => Math.max(0, current - 1));
							}}
							disabled={activeStep === 0}
							className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("walkthroughPrevious")}
						</button>
						<button
							type="button"
							onClick={() => {
								if (activeStep === steps.length - 1) {
									onClose();
								} else {
									setActiveStep((current) => current + 1);
								}
							}}
							className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
						>
							{activeStep === steps.length - 1
								? t("walkthroughFinish")
								: t("walkthroughNext")}
						</button>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("skip")}
						</button>
						<Link
							href="/create"
							onClick={onClose}
							className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("createFirst")}
						</Link>
					</div>
				</section>
			</div>
		</dialog>
	);
}

// Reads nextId from the contract to know the total count, then renders IDs in reverse
// (newest first). Each ID is rendered as a separate SingleContract so reads are parallelised
// by wagmi's internal query deduplication rather than one large multicall.
function ContractList({
	address,
	role,
	showIntroActions,
	onShowHelp,
	onSkipIntro,
	loadingLabel,
}: {
	address: `0x${string}`;
	role: "client" | "freelancer";
	showIntroActions: boolean;
	onShowHelp: () => void;
	onSkipIntro: () => void;
	loadingLabel: string;
}): React.JSX.Element {
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
	const { data: allContracts, isLoading } = useReadContracts({ contracts: contractConfigs });

	const visibleContracts = useMemo(() => {
		if (allContracts === undefined) return [];
		const addr = address.toLowerCase();
		return allContracts
			.map((result, index) => ({
				id: BigInt(index),
				contract: result.status === "success" ? result.result : undefined,
			}))
			.filter(
				(item): item is { id: bigint; contract: Contract } =>
					item.contract !== undefined &&
					(role === "client"
						? item.contract.client.toLowerCase() === addr
						: item.contract.freelancer.toLowerCase() === addr),
			)
			.reverse();
	}, [allContracts, address, role]);

	if (total === 0 || (!isLoading && visibleContracts.length === 0)) {
		return (
			<DashboardEmptyState
				role={role}
				showIntroActions={showIntroActions}
				onShowHelp={onShowHelp}
				onSkipIntro={onSkipIntro}
			/>
		);
	}

	if (isLoading && visibleContracts.length === 0) {
		return (
			<div className="space-y-4" aria-live="polite" aria-label={loadingLabel}>
				{[0, 1, 2].map((item) => (
					<div
						key={item}
						className="tl-skeleton-card rounded-2xl border border-gray-200 p-5 dark:border-white/10"
					>
						<div className="h-4 w-16 rounded-full bg-gray-200/80 dark:bg-white/10" />
						<div className="mt-4 h-5 w-2/3 rounded-full bg-gray-200/80 dark:bg-white/10" />
						<div className="mt-6 grid gap-3 sm:grid-cols-2">
							<div className="h-4 rounded-full bg-gray-200/80 dark:bg-white/10" />
							<div className="h-4 rounded-full bg-gray-200/80 dark:bg-white/10" />
							<div className="h-4 rounded-full bg-gray-200/80 dark:bg-white/10" />
							<div className="h-4 rounded-full bg-gray-200/80 dark:bg-white/10" />
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{visibleContracts.map(({ id, contract }) => (
				<ContractCard key={id.toString()} id={id} contract={contract} address={address} />
			))}
		</div>
	);
}

export default function DashboardPage(): React.JSX.Element {
	const t = useTranslations("Dashboard");
	const { address, isConnected } = useAccount();
	const { role } = useRole();
	const [walkthroughOpen, setWalkthroughOpen] = useState(false);
	const [showIntroActions, setShowIntroActions] = useState(false);

	useEffect(() => {
		if (!isConnected || address === undefined) return;
		let active = true;
		let timer: number | null = null;
		void readDashboardVisitedPreference().then((visited) => {
			if (!active || visited) return;
			timer = window.setTimeout(() => {
				if (!active) return;
				setShowIntroActions(true);
				setWalkthroughOpen(true);
			}, 0);
		});
		return (): void => {
			active = false;
			if (timer !== null) window.clearTimeout(timer);
		};
	}, [address, isConnected]);

	useEffect(() => {
		if (!walkthroughOpen) return;

		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === "Escape") {
				void markDashboardVisitedPreference();
				setWalkthroughOpen(false);
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return (): void => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [walkthroughOpen]);

	function openWalkthrough(): void {
		setShowIntroActions(true);
		setWalkthroughOpen(true);
	}

	function closeWalkthrough(): void {
		void markDashboardVisitedPreference();
		setShowIntroActions(false);
		setWalkthroughOpen(false);
	}

	function skipIntro(): void {
		void markDashboardVisitedPreference();
		setShowIntroActions(false);
		setWalkthroughOpen(false);
	}

	if (!isConnected || address === undefined) {
		return <WalletRequiredPage />;
	}

	const roleLabel = role === "client" ? t("isClient") : t("isFreelancer");

	return (
		<div className="tl-app-shell tl-app-shell--wide">
			<div className="tl-page-header">
				<div>
					<h1 className="tl-page-title">{t("title")}</h1>
					<p className="tl-page-description text-gray-500 dark:text-gray-400">
						{t("contractsWhere", { role: roleLabel.toLowerCase() })}
					</p>
				</div>
				<Link
					href="/create"
					className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
				>
					{t("newButton")}
				</Link>
			</div>

			<SummaryBanner address={address} role={role} />
			<ContractList
				address={address}
				role={role}
				showIntroActions={showIntroActions}
				onShowHelp={openWalkthrough}
				onSkipIntro={skipIntro}
				loadingLabel={t("loadingContracts")}
			/>
			<DashboardHelpButton onClick={openWalkthrough} />
			<DashboardWalkthrough open={walkthroughOpen} onClose={closeWalkthrough} />
		</div>
	);
}
