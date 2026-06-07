"use client";

import { useReducer } from "react";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { formatTokenAmount } from "@/lib/utils";
import type { MagicLinkPayload } from "@/lib/magicLink";
import { TokenVerificationLoader } from "./TokenVerificationLoader";
import { ContractSummaryPanel } from "./ContractSummaryPanel";
import { ActionButtons } from "./ActionButtons";

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
	return (
		<div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">
			<h1 className="text-2xl font-bold mb-2">Review Contract Offer</h1>
			{children}
		</div>
	);
}

interface Props {
	initialPayload: MagicLinkPayload | null;
	tokenError: string | null;
}

export function ReviewPageInner({ initialPayload, tokenError }: Props): React.JSX.Element {
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

	const explorerTxUrl = txHash !== undefined ? getExplorerTxUrl(chainId, txHash) : null;
	const statusLabel = contract !== undefined ? (STATUS_LABELS[contract.status] ?? "Unknown") : "";
	const busy = isSending || isConfirming;

	function handleAccept(): void {
		if (payload === null) return;
		dispatch({ type: "SET_ACTION", action: "accept" });
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "acceptContractByFreelancer",
			args: [BigInt(payload.contractId)],
		});
	}

	function handleReject(): void {
		if (payload === null) return;
		dispatch({ type: "SET_ACTION", action: "reject" });
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "rejectContractByFreelancer",
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
					{accepted ? "Offer Accepted!" : "Offer Declined"}
				</h2>
				<p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
					{accepted
						? "The client will now be notified to fund the escrow. The project deadline starts once funds are locked."
						: "The offer has been declined. No funds were held."}
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

	return (
		<TokenVerificationLoader
			tokenError={tokenError}
			isConnected={isConnected}
			address={address}
			payload={payload}
			contractLoading={contractLoading}
			contract={contract}
			statusLabel={statusLabel}
		>
			<PageShell>
				<p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
					The client proposes{" "}
					<span className="font-medium text-gray-900 dark:text-white">
						{contract !== undefined
							? formatTokenAmount(contract.amount, contract.token)
							: ""}
					</span>{" "}
					in escrow. Review the offer below. Accepting signals your agreement — the client
					will then fund the escrow to start the project deadline.
				</p>

				{contract !== undefined && (
					<ContractSummaryPanel
						contract={contract}
						statusLabel={statusLabel}
						decryptOpen={decryptOpen}
						onToggleDecrypt={() => {
							dispatch({ type: "TOGGLE_DECRYPT" });
						}}
					/>
				)}

				<ActionButtons
					busy={busy}
					action={action}
					isConfirming={isConfirming}
					onAccept={handleAccept}
					onReject={handleReject}
					writeError={writeError}
				/>
			</PageShell>
		</TokenVerificationLoader>
	);
}
