"use client";

import { useReducer, useRef, useEffect } from "react";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { useLocale, useTranslations } from "next-intl";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { ERC20_ABI } from "@/lib/erc20Abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { formatTokenAmount } from "@/lib/utils";
import type { MagicLinkPayload } from "@/lib/magicLink";
import { TokenVerificationLoader } from "./TokenVerificationLoader";
import { ContractDetailPanel } from "./ContractDetailPanel";
import { AcceptRejectActions } from "./AcceptRejectActions";

const STATUS_KEYS = [
	"PENDING",
	"ACTIVE",
	"SUBMITTED",
	"APPROVED",
	"DISPUTED",
	"RESOLVED",
	"CANCELLED",
] as const;

interface PageState {
	decryptOpen: boolean;
	action: "accept" | "reject" | null;
}

type PageAction = { type: "TOGGLE_DECRYPT" } | { type: "SET_ACTION"; action: "accept" | "reject" };

function pageReducer(state: PageState, action: PageAction): PageState {
	switch (action.type) {
		case "TOGGLE_DECRYPT":
			return { ...state, decryptOpen: !state.decryptOpen };
		case "SET_ACTION":
			return { ...state, action: action.action };
	}
}

function PageShell({ children }: { children: React.ReactNode }): React.JSX.Element {
	return <div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">{children}</div>;
}

interface Props {
	initialPayload: MagicLinkPayload | null;
	tokenError: string | null;
}

export function AcceptPageInner({ initialPayload, tokenError }: Props): React.JSX.Element {
	const t = useTranslations("Client");
	const tStatus = useTranslations("ContractStatus");
	const locale = useLocale();
	const [state, dispatch] = useReducer(pageReducer, { decryptOpen: false, action: null });
	const { decryptOpen, action } = state;
	const payload = initialPayload;

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
		dispatch({ type: "SET_ACTION", action: "accept" });

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
		dispatch({ type: "SET_ACTION", action: "reject" });
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
					{accepted ? t("contractAccepted") : t("proposalRejected")}
				</h2>
				<p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
					{accepted ? t("escrowFunded") : t("proposalDeclined")}
				</p>
				{txHash !== undefined && explorerTxUrl !== null && (
					<a
						href={explorerTxUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm underline underline-offset-2 block text-center"
					>
						{t("viewTransaction")}
					</a>
				)}
			</PageShell>
		);
	}

	const statusLabel =
		contract !== undefined ? tStatus(STATUS_KEYS[contract.status] ?? "PENDING") : "";
	const canRespond = contract?.status === 0; // PENDING
	const txStatus = isApproveSending
		? ("approve-sending" as const)
		: isApproveConfirming
			? ("approve-confirming" as const)
			: isConfirming
				? ("confirming" as const)
				: isSending
					? ("sending" as const)
					: ("idle" as const);
	const formattedAmount =
		contract !== undefined ? formatTokenAmount(contract.amount, contract.token, locale) : "";

	return (
		<TokenVerificationLoader
			tokenError={tokenError}
			isConnected={isConnected}
			address={address}
			payload={payload}
			contractLoading={contractLoading}
			contract={contract}
		>
			<PageShell>
				<h1 className="text-2xl font-bold mb-1">
					{t("contractTitle", { id: payload?.contractId ?? "" })}
				</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
					{t("reviewTerms", { amount: formattedAmount })}
					{isToken && (
						<span className="block mt-1 text-amber-600 dark:text-amber-400">
							{t("usdcNote")}
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
							dispatch({ type: "TOGGLE_DECRYPT" });
						}}
					/>
				)}

				<AcceptRejectActions
					txStatus={txStatus}
					action={action}
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
