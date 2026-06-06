"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { DecryptDocumentForm } from "@/components/DecryptDocumentForm";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { formatEth, resolveDocUrl } from "@/lib/utils";
import type { MagicLinkPayload } from "@/lib/magicLink";

// The client lands here from the magic-link email. They review the freelancer's
// proposal, securely view the (optionally encrypted) IPFS contract document, then
// either accept — funding the escrow in the same transaction — or reject it.
function AcceptPageInner(): React.JSX.Element {
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";

	const [payload, setPayload] = useState<MagicLinkPayload | null>(null);
	const [tokenError, setTokenError] = useState<string | null>(
		token === "" ? "No token provided." : null,
	);
	const [tokenLoading, setTokenLoading] = useState(token !== "");
	const [decryptOpen, setDecryptOpen] = useState(false);

	useEffect(() => {
		if (token === "") return;
		const verify = async (): Promise<void> => {
			try {
				const r = await fetch(`/api/magic-link/verify?token=${encodeURIComponent(token)}`);
				const data = (await r.json()) as {
					ok?: boolean;
					error?: string;
					payload?: MagicLinkPayload;
				};
				if (data.ok === true && data.payload !== undefined) setPayload(data.payload);
				else setTokenError(data.error ?? "Invalid link.");
			} catch {
				setTokenError("Failed to verify link.");
			} finally {
				setTokenLoading(false);
			}
		};
		void verify();
	}, [token]);

	const { address, isConnected } = useAccount();
	const chainId = useChainId();

	const contractId = payload !== null ? BigInt(payload.contractId) : 0n;

	const { data: contract, isLoading: contractLoading } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "getContract",
		args: [contractId],
		query: { enabled: payload !== null },
	});

	const {
		writeContract,
		data: txHash,
		isPending: isSending,
		error: writeError,
	} = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
	// Tracks which action the in-flight transaction represents so the success screen
	// can show the right copy.
	const [action, setAction] = useState<"accept" | "reject" | null>(null);

	const explorerTxUrl = txHash !== undefined ? getExplorerTxUrl(chainId, txHash) : null;

	function handleAccept(): void {
		if (payload === null || contract === undefined) return;
		setAction("accept");
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "acceptContract",
			args: [BigInt(payload.contractId)],
			value: contract.amount, // fund the escrow with exactly the proposed amount
		});
	}

	function handleReject(): void {
		if (payload === null) return;
		setAction("reject");
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "rejectContract",
			args: [BigInt(payload.contractId)],
		});
	}

	// - Loading states -
	if (tokenLoading)
		return (
			<PageShell>
				<p className="text-gray-500 dark:text-gray-400">Verifying link…</p>
			</PageShell>
		);

	if (tokenError !== null) {
		return (
			<PageShell>
				<div className="rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-5 text-center">
					<p className="text-red-500 dark:text-red-400 font-semibold mb-1">
						Invalid or Expired Link
					</p>
					<p className="text-gray-500 dark:text-gray-400 text-sm">{tokenError}</p>
				</div>
			</PageShell>
		);
	}

	if (!isConnected) {
		return (
			<PageShell>
				<p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
					Connect the wallet at{" "}
					<span className="font-mono text-indigo-600 dark:text-indigo-400">
						{payload?.clientAddress}
					</span>{" "}
					to review contract #{payload?.contractId}.
				</p>
				<ConnectButton />
			</PageShell>
		);
	}

	// Wallet address mismatch
	const expectedAddress = payload?.clientAddress.toLowerCase();
	if (address?.toLowerCase() !== expectedAddress) {
		return (
			<PageShell>
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-6 py-5">
					<p className="text-yellow-600 dark:text-yellow-400 font-semibold mb-1">
						Wrong Wallet
					</p>
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						This link is for{" "}
						<span className="font-mono text-yellow-600 dark:text-yellow-300">
							{payload?.clientAddress}
						</span>
						. Please switch to that account.
					</p>
				</div>
				<div className="mt-4">
					<ConnectButton />
				</div>
			</PageShell>
		);
	}

	if (contractLoading || contract === undefined) {
		return (
			<PageShell>
				<p className="text-gray-500 dark:text-gray-400">Loading contract…</p>
			</PageShell>
		);
	}

	const statusLabel = STATUS_LABELS[contract.status] ?? "Unknown";

	if (isSuccess) {
		const accepted = action === "accept";
		return (
			<PageShell>
				<div
					className={`w-16 h-16 rounded-full ${accepted ? "bg-green-500/10" : "bg-gray-500/10"} flex items-center justify-center mx-auto mb-4`}
				>
					<svg
						className={`w-8 h-8 ${accepted ? "text-green-500 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d={accepted ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"}
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-bold text-center mb-2">
					{accepted ? "Contract Accepted!" : "Proposal Rejected"}
				</h2>
				<p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
					{accepted
						? "The escrow is funded and the project deadline timer has started."
						: "The proposal has been declined. No funds were transferred."}
				</p>
				{txHash !== undefined && explorerTxUrl !== null && (
					<a
						href={explorerTxUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm underline underline-offset-2 block text-center"
					>
						View transaction
					</a>
				)}
			</PageShell>
		);
	}

	const canRespond = contract.status === 0; // PENDING
	const docUrl = resolveDocUrl(contract.contractURI);
	const busy = isSending || isConfirming;

	return (
		<PageShell>
			<h1 className="text-2xl font-bold mb-1">Contract #{payload?.contractId}</h1>
			<p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
				Review the terms and document below. Accepting locks {formatEth(contract.amount)} in
				escrow.
			</p>

			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3 text-sm mb-6">
				<Row label="Status" value={statusLabel} />
				<Row label="Client" value={contract.client} mono />
				<Row label="Freelancer" value={contract.freelancer} mono />
				<Row label="Amount" value={formatEth(contract.amount)} />
				<Row
					label="Deadline"
					value={
						contract.projectDeadline > 0n
							? `~${String(Math.round(Number(contract.projectDeadline) / 86400))} days after acceptance`
							: "Set on acceptance"
					}
				/>
				{contract.holdBackBps > 0 && (
					<Row label="Hold-back" value={`${String(contract.holdBackBps / 100)}%`} />
				)}
				{docUrl !== undefined && (
					<Row
						label="Document"
						value={
							<span className="flex items-center justify-end gap-2">
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
							</span>
						}
					/>
				)}
			</div>

			{/* Decrypt-and-view panel for AES-256-GCM encrypted documents. */}
			{docUrl !== undefined && decryptOpen && (
				<div className="mb-6">
					<DecryptDocumentForm
						gatewayUrl={docUrl}
						onClose={() => {
							setDecryptOpen(false);
						}}
					/>
				</div>
			)}

			{!canRespond && (
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 mb-4">
					Contract is not awaiting acceptance (current: {statusLabel}). It may already be
					accepted, rejected, or withdrawn.
				</div>
			)}

			{writeError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
					{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
				</p>
			)}

			<div className="flex gap-3">
				<button
					onClick={handleAccept}
					disabled={!canRespond || busy}
					className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
				>
					{busy && action === "accept"
						? isConfirming
							? "Confirming on-chain…"
							: "Waiting for wallet…"
						: `Accept & Fund (${formatEth(contract.amount)})`}
				</button>
				<button
					onClick={handleReject}
					disabled={!canRespond || busy}
					className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold transition-colors"
				>
					{busy && action === "reject" ? "Rejecting…" : "Reject"}
				</button>
			</div>
		</PageShell>
	);
}

function Row({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="flex justify-between gap-4">
			<span className="text-gray-500 shrink-0">{label}</span>
			<span
				className={`text-right truncate ${mono ? "font-mono text-xs text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}
			>
				{value}
			</span>
		</div>
	);
}

function PageShell({ children }: { children: React.ReactNode }): React.JSX.Element {
	return <div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">{children}</div>;
}

export default function AcceptPage(): React.JSX.Element {
	return (
		<Suspense
			fallback={<div className="max-w-lg mx-auto px-6 py-16 text-gray-400">Loading…</div>}
		>
			<AcceptPageInner />
		</Suspense>
	);
}
