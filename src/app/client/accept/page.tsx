"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { ERC20_ABI } from "@/lib/erc20Abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { formatTokenAmount } from "@/lib/utils";
import type { MagicLinkPayload } from "@/lib/magicLink";
import { TokenVerificationLoader } from "./_components/TokenVerificationLoader";
import { ContractDetailPanel } from "./_components/ContractDetailPanel";
import { AcceptRejectActions } from "./_components/AcceptRejectActions";

// The client lands here from the magic-link email. They review the freelancer's
// proposal, securely view the (optionally encrypted) IPFS contract document, then
// either accept — funding the escrow in the same transaction — or reject it.

function PageShell({ children }: { children: React.ReactNode }): React.JSX.Element {
	return <div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">{children}</div>;
}

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

	// Separate hook for the USDC approve step that precedes acceptContract.
	const {
		writeContract: writeApprove,
		data: approveTxHash,
		isPending: isApproveSending,
		error: approveError,
	} = useWriteContract();
	const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
		useWaitForTransactionReceipt({ hash: approveTxHash });

	// Tracks which action the in-flight transaction represents so the success screen
	// can show the right copy.
	const [action, setAction] = useState<"accept" | "reject" | null>(null);
	// Ref tracks whether we're in the "approving" half of the USDC two-step flow.
	// A ref avoids triggering setState inside a useEffect (which would cause cascading renders).
	const approveStepRef = useRef<"idle" | "approving">("idle");

	const isToken =
		contract !== undefined && contract.token !== "0x0000000000000000000000000000000000000000";

	// Read current USDC allowance so we can skip the approve step when already sufficient.
	const { data: currentAllowance } = useReadContract({
		address: contract?.token,
		abi: ERC20_ABI,
		functionName: "allowance",
		args: [address ?? "0x0000000000000000000000000000000000000000", TRUSTLEDGER_ADDRESS],
		query: { enabled: isToken && address !== undefined },
	});

	// After approve confirms, auto-trigger acceptContract.
	useEffect(() => {
		if (
			isApproveSuccess &&
			approveStepRef.current === "approving" &&
			contract !== undefined &&
			payload !== null
		) {
			approveStepRef.current = "idle";
			writeContract({
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: "acceptContract",
				args: [BigInt(payload.contractId)],
			});
		}
	}, [isApproveSuccess, contract, payload, writeContract]);

	const explorerTxUrl = txHash !== undefined ? getExplorerTxUrl(chainId, txHash) : null;

	function handleAccept(): void {
		if (payload === null || contract === undefined) return;
		setAction("accept");

		if (isToken) {
			// ERC-20: check allowance first, approve if needed, then fund.
			const hasAllowance =
				currentAllowance !== undefined && currentAllowance >= contract.amount;
			if (hasAllowance) {
				writeContract({
					address: TRUSTLEDGER_ADDRESS,
					abi: TRUSTLEDGER_ABI,
					functionName: "acceptContract",
					args: [BigInt(payload.contractId)],
				});
			} else {
				approveStepRef.current = "approving";
				writeApprove({
					address: contract.token,
					abi: ERC20_ABI,
					functionName: "approve",
					args: [TRUSTLEDGER_ADDRESS, contract.amount],
				});
			}
		} else {
			writeContract({
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: "acceptContract",
				args: [BigInt(payload.contractId)],
				value: contract.amount,
			});
		}
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

	const statusLabel = contract !== undefined ? (STATUS_LABELS[contract.status] ?? "Unknown") : "";
	const canRespond = contract?.status === 0; // PENDING
	const busy = isSending || isConfirming || isApproveSending || isApproveConfirming;
	const formattedAmount =
		contract !== undefined ? formatTokenAmount(contract.amount, contract.token) : "";

	return (
		<TokenVerificationLoader
			tokenLoading={tokenLoading}
			tokenError={tokenError}
			isConnected={isConnected}
			address={address}
			payload={payload}
			contractLoading={contractLoading}
			contract={contract}
		>
			<PageShell>
				<h1 className="text-2xl font-bold mb-1">Contract #{payload?.contractId}</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
					Review the terms and document below. Accepting locks {formattedAmount} in
					escrow.
					{isToken && (
						<span className="block mt-1 text-amber-600 dark:text-amber-400">
							This contract uses USDC. You will approve the transfer in a separate
							step before funding.
						</span>
					)}
				</p>

				{contract !== undefined && (
					<ContractDetailPanel
						contract={contract}
						statusLabel={statusLabel}
						isToken={isToken}
						decryptOpen={decryptOpen}
						onToggleDecrypt={() => {
							setDecryptOpen((o) => !o);
						}}
					/>
				)}

				<AcceptRejectActions
					busy={busy}
					action={action}
					isApproveSending={isApproveSending}
					isApproveConfirming={isApproveConfirming}
					isConfirming={isConfirming}
					canRespond={canRespond}
					isToken={isToken}
					formattedAmount={formattedAmount}
					onAccept={handleAccept}
					onReject={handleReject}
					approveError={approveError}
					writeError={writeError}
				/>
			</PageShell>
		</TokenVerificationLoader>
	);
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
