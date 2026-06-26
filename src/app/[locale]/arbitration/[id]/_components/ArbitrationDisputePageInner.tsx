"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
	useAccount,
	useReadContract,
	useReadContracts,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { RowActionMenu } from "@/components/RowActionMenu";
import { encodePacked, formatEther, keccak256 } from "viem";
import { ARBITRATION_ABI } from "@/lib/abi";
import { ARBITRATION_ADDRESS } from "@/lib/wagmi";
import { formatAddress, formatDeadline } from "@/lib/utils";
import {
	calculateAppealBond,
	calculateLinearPayout,
	isRulingSet,
	validateEvidenceInput,
} from "@/utils/arbitration";
import {
	clearEvidenceDraft,
	readEvidenceDraft,
	writeEvidenceDraft,
} from "@/store/arbitrationDrafts";
import Link from "next/link";

const PHASE_COLORS: Record<number, string> = {
	0: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300",
	1: "bg-blue-500/20 text-blue-600 dark:text-blue-300",
	2: "bg-green-500/20 text-green-600 dark:text-green-300",
	3: "bg-red-500/20 text-red-600 dark:text-red-300",
	4: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-300",
	5: "bg-blue-500/20 text-blue-600 dark:text-blue-300",
	6: "bg-green-500/20 text-green-600 dark:text-green-300",
};

function saltKey(id: string): string {
	return `tl-dispute-${id}-salt`;
}
function pctKey(id: string): string {
	return `tl-dispute-${id}-pct`;
}

// Captured at module load; avoids calling Date.now() during render
const PAGE_LOAD_TIME_S = BigInt(Math.floor(Date.now() / 1000));

interface EvidenceRecord {
	submitter: `0x${string}`;
	summary: string;
	uri: string;
	requestedCompletionPct: bigint;
	submittedAt: bigint;
}

interface DisputeView {
	client: `0x${string}`;
	freelancer: `0x${string}`;
	contractId: bigint;
	contractAmount: bigint;
	feePool: bigint;
	phase: number;
	phaseDeadline: bigint;
	jurorCount: bigint;
	maxJurors: bigint;
	ruling: bigint;
	finalized: boolean;
	appealed: boolean;
}

interface DisputeActionState {
	appealWindowOpen: boolean;
	canExecute: boolean;
	isConnected: boolean;
	isMajorityJuror: boolean | undefined;
	isParty: boolean;
	isSelectedJuror: boolean;
	phaseDeadlinePassed: boolean;
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
				type="button"
				disabled={isPending || isConfirming}
				onClick={() => {
					writeContract({
						address: ARBITRATION_ADDRESS,
						abi: ARBITRATION_ABI,
						functionName: functionName as never,
						args: [disputeId],
					});
				}}
				className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium transition-colors"
			>
				{isPending || isConfirming ? "…" : label}
			</button>
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
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
	const t = useTranslations("Arbitration");
	const [pct, setPct] = useState(50);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	useEffect(() => {
		if (isSuccess) {
			clearEvidenceDraft(disputeId);
		}
	}, [disputeId, isSuccess]);
	const idStr = disputeId.toString();

	function handleCommit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		const saltBytes = crypto.getRandomValues(new Uint8Array(32));
		const salt = `0x${Array.from(saltBytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")}`;

		const commitment = keccak256(
			encodePacked(
				["uint256", "address", "uint256", "bytes32"],
				[disputeId, address, BigInt(pct), salt as `0x${string}`],
			),
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
				<p className="text-sm text-green-600 dark:text-green-300 font-medium">
					{t("voteCommitted")}
				</p>
				<p className="text-xs text-green-700/80 dark:text-green-400/80 mt-1">
					{t("saltSaved")}
				</p>
			</div>
		);

	return (
		<form onSubmit={handleCommit} className="flex flex-col gap-3">
			<p className="text-xs text-gray-500 dark:text-gray-400">{t("commitInstructions")}</p>
			<div className="flex items-center gap-4">
				<input
					aria-label={t("completionPercentage")}
					type="range"
					min={0}
					max={100}
					value={pct}
					onChange={(e) => {
						setPct(Number(e.target.value));
					}}
					className="flex-1 accent-indigo-500"
				/>
				<span className="w-12 text-right text-gray-900 dark:text-white font-mono text-sm">
					{pct}%
				</span>
			</div>
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming}
				className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? t("committing") : t("commitVote")}
			</button>
		</form>
	);
}

// ─── Reveal vote form ─────────────────────────────────────────────────────────

function RevealForm({ disputeId }: { disputeId: bigint }): React.JSX.Element {
	const t = useTranslations("Arbitration");
	const idStr = disputeId.toString();
	const storedSalt =
		(typeof window !== "undefined" ? localStorage.getItem(saltKey(idStr)) : null) ?? "";
	const storedPct =
		(typeof window !== "undefined" ? localStorage.getItem(pctKey(idStr)) : null) ?? "50";

	const [pct, setPct] = useState(Number(storedPct));
	const [salt, setSalt] = useState(storedSalt);
	const [saltTouched, setSaltTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	// revealVote takes a bytes32 salt: exactly 0x followed by 64 hex characters.
	const saltError =
		salt.trim() === ""
			? t("saltRequired")
			: !/^0x[0-9a-fA-F]{64}$/.test(salt.trim())
				? t("saltInvalid")
				: undefined;

	function handleReveal(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setSaltTouched(true);
		if (saltError !== undefined) return;
		writeContract({
			address: ARBITRATION_ADDRESS,
			abi: ARBITRATION_ABI,
			functionName: "revealVote",
			args: [disputeId, BigInt(pct), salt as `0x${string}`],
		});
	}

	if (isSuccess)
		return <p className="text-sm text-green-700 dark:text-green-400">{t("voteRevealed")}</p>;

	return (
		<form onSubmit={handleReveal} className="flex flex-col gap-3">
			<p className="text-xs text-gray-500 dark:text-gray-400">{t("revealInstructions")}</p>
			<div className="flex items-center gap-4">
				<input
					aria-label={t("completionPercentageReveal")}
					type="range"
					min={0}
					max={100}
					value={pct}
					onChange={(e) => {
						setPct(Number(e.target.value));
					}}
					className="flex-1 accent-indigo-500"
				/>
				<span className="w-12 text-right text-gray-900 dark:text-white font-mono text-sm">
					{pct}%
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<label htmlFor="arb-salt" className="text-xs text-gray-500">
					{t("saltLabel")}
				</label>
				<input
					id="arb-salt"
					type="text"
					value={salt}
					onChange={(e) => {
						setSalt(e.target.value);
					}}
					onBlur={() => {
						setSaltTouched(true);
					}}
					placeholder={t("saltPlaceholder")}
					aria-invalid={saltTouched && saltError !== undefined}
					className={`rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 ${
						saltTouched && saltError !== undefined
							? "border-red-500 dark:border-red-500 focus:ring-red-500"
							: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
					}`}
				/>
				{saltTouched && saltError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{saltError}</p>
				)}
			</div>
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming || saltError !== undefined}
				className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? t("revealing") : t("revealVote")}
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
	const t = useTranslations("Arbitration");
	const bond = calculateAppealBond(feePool);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	if (isSuccess)
		return <p className="text-sm text-green-700 dark:text-green-400">{t("appealFiled")}</p>;

	return (
		<div className="flex flex-col gap-1">
			<p className="text-xs text-gray-500 dark:text-gray-400">
				{t.rich("bondRequired", {
					amount: formatEther(bond),
					amountStrong: (chunks) => (
						<span className="text-gray-900 dark:text-white">{chunks}</span>
					),
				})}
			</p>
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="button"
				disabled={isPending || isConfirming}
				onClick={() => {
					writeContract({
						address: ARBITRATION_ADDRESS,
						abi: ARBITRATION_ABI,
						functionName: "appeal",
						args: [disputeId],
						value: bond,
					});
				}}
				className="px-4 py-2 text-sm rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? t("filingAppeal") : t("fileAppeal")}
			</button>
		</div>
	);
}

function EvidenceForm({ disputeId }: { disputeId: bigint }): React.JSX.Element {
	const t = useTranslations("Arbitration");
	const savedDraft = readEvidenceDraft(disputeId);
	const [summary, setSummary] = useState(savedDraft?.summary ?? "");
	const [uri, setUri] = useState(savedDraft?.uri ?? "");
	const [requestedCompletionPct, setRequestedCompletionPct] = useState(
		savedDraft?.requestedCompletionPct ?? 50,
	);
	const [touched, setTouched] = useState(false);
	const { writeContract, data: txHash, isPending, error } = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const inputError = validateEvidenceInput({ summary, uri, requestedCompletionPct });

	function saveDraft(next: {
		summary?: string;
		uri?: string;
		requestedCompletionPct?: number;
	}): void {
		const draft = {
			summary: next.summary ?? summary,
			uri: next.uri ?? uri,
			requestedCompletionPct: next.requestedCompletionPct ?? requestedCompletionPct,
		};
		writeEvidenceDraft(disputeId, draft);
	}

	function submit(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		setTouched(true);
		if (inputError !== undefined) return;
		writeContract({
			address: ARBITRATION_ADDRESS,
			abi: ARBITRATION_ABI,
			functionName: "submitEvidence",
			args: [disputeId, summary.trim(), uri.trim(), BigInt(requestedCompletionPct)],
		});
	}

	if (isSuccess) {
		return (
			<p className="text-sm text-green-700 dark:text-green-400">{t("evidenceSubmitted")}</p>
		);
	}

	return (
		<form onSubmit={submit} className="flex flex-col gap-3">
			<label htmlFor="evidence-summary" className="text-xs text-gray-500">
				{t("evidenceSummary")}
			</label>
			<textarea
				id="evidence-summary"
				value={summary}
				onChange={(e) => {
					setSummary(e.target.value);
					saveDraft({ summary: e.target.value });
				}}
				onBlur={() => {
					setTouched(true);
				}}
				rows={4}
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
			/>
			<label htmlFor="evidence-uri" className="text-xs text-gray-500">
				{t("supportingEvidenceUri")}
			</label>
			<input
				id="evidence-uri"
				type="url"
				value={uri}
				onChange={(e) => {
					setUri(e.target.value);
					saveDraft({ uri: e.target.value });
				}}
				placeholder={t("evidenceUriPlaceholder")}
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
			/>
			<div className="flex items-center gap-4">
				<input
					aria-label={t("requestedCompletionPercentage")}
					type="range"
					min={0}
					max={100}
					value={requestedCompletionPct}
					onChange={(e) => {
						const nextPct = Number(e.target.value);
						setRequestedCompletionPct(nextPct);
						saveDraft({ requestedCompletionPct: nextPct });
					}}
					className="flex-1 accent-indigo-500"
				/>
				<span className="w-12 text-right text-gray-900 dark:text-white font-mono text-sm">
					{requestedCompletionPct}%
				</span>
			</div>
			{touched && inputError !== undefined && (
				<p className="text-xs text-red-500 dark:text-red-400">{inputError}</p>
			)}
			{error !== null && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{(error as { shortMessage?: string }).shortMessage ?? error.message}
				</p>
			)}
			<button
				type="submit"
				disabled={isPending || isConfirming || inputError !== undefined}
				className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold self-start transition-colors"
			>
				{isPending || isConfirming ? t("submittingEvidence") : t("submitEvidence")}
			</button>
		</form>
	);
}

function DisputeHeader({
	id,
	contractId,
	phase,
	phaseLabel,
}: {
	id: string;
	contractId: bigint;
	phase: number;
	phaseLabel: string;
}): React.JSX.Element {
	const t = useTranslations("Arbitration");

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
				<span className="text-xs text-gray-500">{t("dispute")}</span>
				<h1 className="text-3xl font-bold">#{id}</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
					{t("contract")}{" "}
					<Link
						href="/dashboard"
						className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
					>
						#{contractId.toString()}
					</Link>
				</p>
			</div>
			<span
				className={`w-fit shrink-0 rounded-full px-2 py-1 text-xs font-medium ${PHASE_COLORS[phase] ?? ""}`}
			>
				{phaseLabel}
			</span>
		</div>
	);
}

function DisputeInfoGrid({
	dispute,
	phaseDeadlinePassed,
}: {
	dispute: DisputeView;
	phaseDeadlinePassed: boolean;
}): React.JSX.Element {
	const t = useTranslations("Arbitration");

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
			<div className="tl-kv-grid text-sm">
				<span className="text-gray-500">{t("client")}</span>
				<span className="text-gray-900 dark:text-white font-mono">
					{formatAddress(dispute.client)}
				</span>

				<span className="text-gray-500">{t("freelancer")}</span>
				<span className="text-gray-900 dark:text-white font-mono">
					{formatAddress(dispute.freelancer)}
				</span>

				<span className="text-gray-500">{t("contractAmount")}</span>
				<span className="text-gray-900 dark:text-white">
					{formatEther(dispute.contractAmount)} ETH
				</span>

				<span className="text-gray-500">{t("feePool")}</span>
				<span className="text-gray-900 dark:text-white">
					{formatEther(dispute.feePool)} ETH
				</span>

				<span className="text-gray-500">{t("phaseDeadline")}</span>
				<span
					className={
						phaseDeadlinePassed
							? "text-red-500 dark:text-red-400"
							: "text-gray-900 dark:text-white"
					}
				>
					{formatDeadline(dispute.phaseDeadline)}
					{phaseDeadlinePassed && ` ${t("elapsed")}`}
				</span>

				<span className="text-gray-500">{t("jurors")}</span>
				<span className="text-gray-900 dark:text-white">
					{dispute.jurorCount.toString()} / {dispute.maxJurors.toString()}
				</span>
			</div>
		</div>
	);
}

function RulingCard({ dispute }: { dispute: DisputeView }): React.JSX.Element | null {
	const t = useTranslations("Arbitration");

	if (!isRulingSet(dispute.ruling)) return null;

	return (
		<div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5 flex flex-col gap-2">
			<h2 className="font-semibold text-gray-900 dark:text-white">{t("ruling")}</h2>
			<p className="text-2xl font-bold text-green-600 dark:text-green-300">
				{t("rulingComplete", { pct: dispute.ruling.toString() })}
			</p>
			<div className="tl-kv-grid mt-1 text-sm">
				<span className="text-gray-500">{t("freelancerReceives")}</span>
				<span className="text-gray-900 dark:text-white">
					{formatEther(calculateLinearPayout(dispute.ruling, dispute.contractAmount))} ETH
				</span>
				<span className="text-gray-500">{t("clientReceives")}</span>
				<span className="text-gray-900 dark:text-white">
					{formatEther(
						dispute.contractAmount -
							calculateLinearPayout(dispute.ruling, dispute.contractAmount) -
							dispute.feePool,
					)}{" "}
					ETH
				</span>
			</div>
		</div>
	);
}

function EvidencePanel({
	disputeId,
	evidence,
	canSubmitEvidence,
}: {
	disputeId: bigint;
	evidence: EvidenceRecord[];
	canSubmitEvidence: boolean;
}): React.JSX.Element {
	const t = useTranslations("Arbitration");

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-semibold text-gray-900 dark:text-white text-sm">
					{t("evidence")}
				</h2>
				<span className="text-xs text-gray-500">
					{t("evidenceSubmittedCount", { count: evidence.length })}
				</span>
			</div>
			{evidence.length === 0 ? (
				<p className="text-sm text-gray-500 dark:text-gray-400">{t("noEvidence")}</p>
			) : (
				<div className="flex flex-col gap-3">
					{evidence.map((item, index) => (
						<div
							key={`${item.submitter}-${item.submittedAt.toString()}-${index.toString()}`}
							className="rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/10 p-4"
						>
							<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
								<span className="text-xs font-mono text-gray-500">
									{formatAddress(item.submitter)}
								</span>
								<span className="text-xs text-gray-500">
									{t("requestsCompletion", {
										percent: item.requestedCompletionPct.toString(),
									})}
								</span>
							</div>
							<p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
								{item.summary}
							</p>
							<a
								href={item.uri}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-2 block break-all text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
							>
								{item.uri}
							</a>
						</div>
					))}
				</div>
			)}
			{canSubmitEvidence && (
				<div className="border-t border-gray-200 dark:border-white/10 pt-4">
					<EvidenceForm disputeId={disputeId} />
				</div>
			)}
		</div>
	);
}

function JurorList({
	jurors,
}: {
	jurors: readonly `0x${string}`[] | undefined;
}): React.JSX.Element | null {
	const t = useTranslations("Arbitration");

	if (jurors === undefined || jurors.length === 0) return null;

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3">
			<h2 className="font-semibold text-gray-900 dark:text-white text-sm">
				{t("selectedJurors")}
			</h2>
			<div className="flex flex-col gap-1">
				{jurors.map((j) => (
					<span key={j} className="text-xs font-mono text-gray-600 dark:text-gray-300">
						{j}
					</span>
				))}
			</div>
		</div>
	);
}

function DisputeActions({
	address,
	dispute,
	disputeId,
	state,
}: {
	address: `0x${string}` | undefined;
	dispute: DisputeView;
	disputeId: bigint;
	state: DisputeActionState;
}): React.JSX.Element {
	const t = useTranslations("Arbitration");
	const phase = dispute.phase;

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white text-sm">{t("actions")}</h2>

			{!state.isConnected && (
				<div className="flex flex-col gap-2">
					<p className="text-sm text-gray-500 dark:text-gray-400">{t("connectWallet")}</p>
					<ConnectButton />
				</div>
			)}

			{state.isConnected &&
				address !== undefined &&
				state.isSelectedJuror &&
				(phase === 0 || phase === 4) &&
				!state.phaseDeadlinePassed && (
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-yellow-600 dark:text-yellow-300">
							{t("youAreSelected")}
						</p>
						<CommitForm disputeId={disputeId} address={address} />
					</div>
				)}

			{state.isConnected &&
				state.isSelectedJuror &&
				(phase === 1 || phase === 5) &&
				!state.phaseDeadlinePassed && (
					<div className="flex flex-col gap-2">
						<p className="text-xs font-medium text-blue-600 dark:text-blue-300">
							{t("revealYourVote")}
						</p>
						<RevealForm disputeId={disputeId} />
					</div>
				)}

			{state.isConnected && state.isParty && state.appealWindowOpen && (
				<div className="flex flex-col gap-2">
					<p className="text-xs font-medium text-red-500 dark:text-red-400">
						{t("appealWindowOpen")}
					</p>
					<AppealButton disputeId={disputeId} feePool={dispute.feePool} />
				</div>
			)}

			{/* Discrete, permissionless actions collapse into a portal disclosure so the
			    panel stays compact and the panel escapes any surrounding overflow; the
			    commit/reveal/appeal/evidence forms above stay inline. Renders nothing
			    when no permissionless action currently applies. */}
			<RowActionMenu label={t("disputeActions")} align="left">
				{state.isConnected &&
					state.isSelectedJuror &&
					dispute.finalized &&
					state.isMajorityJuror === true && (
						<PermissionlessButton
							label={t("claimReward")}
							disputeId={disputeId}
							functionName="claimReward"
						/>
					)}
				{(phase === 0 || phase === 4) &&
					(state.phaseDeadlinePassed || dispute.jurorCount >= dispute.maxJurors) && (
						<PermissionlessButton
							label={t("advanceToReveal")}
							disputeId={disputeId}
							functionName="advanceToReveal"
						/>
					)}
				{(phase === 1 || phase === 5) && state.phaseDeadlinePassed && (
					<PermissionlessButton
						label={t("finalizeDispute")}
						disputeId={disputeId}
						functionName="finalizeDispute"
					/>
				)}
				{state.canExecute && (
					<div className="flex flex-col gap-1">
						<p className="text-xs text-gray-500 dark:text-gray-400">
							{t("appealWindowElapsed")}
						</p>
						<PermissionlessButton
							label={t("executeRuling")}
							disputeId={disputeId}
							functionName="executeRuling"
						/>
					</div>
				)}
			</RowActionMenu>

			{state.isConnected && !state.isSelectedJuror && !state.isParty && dispute.finalized && (
				<p className="text-sm text-gray-500">{t("notPartyOrJuror")}</p>
			)}
		</div>
	);
}

// ─── Main dispute page ────────────────────────────────────────────────────────

export function ArbitrationDisputePageInner(): React.JSX.Element {
	const t = useTranslations("Arbitration");
	const tPhase = useTranslations("ArbitrationPhase");
	const { id } = useParams<{ id: string }>();
	const disputeId = BigInt(id);
	const { address, isConnected } = useAccount();

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
		query: { enabled: address !== undefined && dispute?.finalized === true },
	});
	const { data: evidenceCount } = useReadContract({
		address: ARBITRATION_ADDRESS,
		abi: ARBITRATION_ABI,
		functionName: "getEvidenceCount",
		args: [disputeId],
	});
	const evidenceIndexes = Array.from({ length: Number(evidenceCount ?? 0n) }, (_, index) =>
		BigInt(index),
	);
	const { data: evidenceResults } = useReadContracts({
		contracts: evidenceIndexes.map((index) => ({
			address: ARBITRATION_ADDRESS,
			abi: ARBITRATION_ABI,
			functionName: "getEvidence",
			args: [disputeId, index],
		})),
		query: { enabled: evidenceIndexes.length > 0 },
	});

	if (isLoading || dispute === undefined)
		return <div className="flex justify-center py-32 text-gray-500">{t("loadingDispute")}</div>;

	const phase = dispute.phase;
	const phaseLabel =
		phase >= 0 && phase <= 6 ? tPhase(String(phase)) : t("phaseUnknown", { phase });
	const isSelectedJuror =
		jurors?.some((j) => j.toLowerCase() === address?.toLowerCase()) ?? false;
	const isClient = address?.toLowerCase() === dispute.client.toLowerCase();
	const isFreelancer = address?.toLowerCase() === dispute.freelancer.toLowerCase();
	const isParty = isClient || isFreelancer;
	const phaseDeadlinePassed = PAGE_LOAD_TIME_S > dispute.phaseDeadline;
	const appealWindowOpen =
		dispute.finalized && !dispute.appealed && PAGE_LOAD_TIME_S <= dispute.phaseDeadline;
	const canExecute =
		dispute.finalized && !dispute.appealed && PAGE_LOAD_TIME_S > dispute.phaseDeadline;

	const evidence = (evidenceResults ?? [])
		.map((result) =>
			result.status === "success" ? (result.result as unknown as EvidenceRecord) : undefined,
		)
		.filter((item): item is EvidenceRecord => item !== undefined);

	return (
		<div className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-6">
			<DisputeHeader
				id={id}
				contractId={dispute.contractId}
				phase={phase}
				phaseLabel={phaseLabel}
			/>
			<DisputeInfoGrid dispute={dispute} phaseDeadlinePassed={phaseDeadlinePassed} />
			<RulingCard dispute={dispute} />
			<EvidencePanel
				disputeId={disputeId}
				evidence={evidence}
				canSubmitEvidence={isConnected && isParty && !dispute.finalized}
			/>
			<JurorList jurors={jurors} />
			<DisputeActions
				address={address}
				dispute={dispute}
				disputeId={disputeId}
				state={{
					appealWindowOpen,
					canExecute,
					isConnected,
					isMajorityJuror,
					isParty,
					isSelectedJuror,
					phaseDeadlinePassed,
				}}
			/>
		</div>
	);
}
