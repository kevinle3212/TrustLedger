"use client";

import { useReducer } from "react";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { useLocale, useTranslations } from "next-intl";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { formatTokenAmount } from "@/lib/utils";
import type { MagicLinkPayload } from "@/lib/magicLink";
import { TokenVerificationLoader } from "./TokenVerificationLoader";
import { ContractSummaryPanel } from "./ContractSummaryPanel";
import { ActionButtons } from "./ActionButtons";

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
	const t = useTranslations("Freelancer");

	return (
		<div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">
			<h1 className="text-2xl font-bold mb-2">{t("reviewOffer")}</h1>
			{children}
		</div>
	);
}

interface Props {
	initialPayload: MagicLinkPayload | null;
	tokenError: string | null;
}

export function ReviewPageInner({ initialPayload, tokenError }: Props): React.JSX.Element {
	const t = useTranslations("Freelancer");
	const tStatus = useTranslations("ContractStatus");
	const locale = useLocale();
	const [state, dispatch] = useReducer(pageReducer, { decryptOpen: false, action: null });
	const { decryptOpen, action } = state;
	const payload = initialPayload;

	const { address, isConnected, status } = useAccount();
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
	const statusLabel =
		contract !== undefined ? tStatus(STATUS_KEYS[contract.status] ?? "PENDING") : "";
	const formattedAmount =
		contract !== undefined ? formatTokenAmount(contract.amount, contract.token, locale) : "";
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
						className={`w-8 h-8 ${accepted ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}
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
					{accepted ? t("offerAccepted") : t("offerDeclined")}
				</h2>
				<p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
					{accepted ? t("clientWillFund") : t("offerHasBeenDeclined")}
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

	return (
		<TokenVerificationLoader
			tokenError={tokenError}
			isConnected={isConnected}
			walletStatus={status}
			address={address}
			payload={payload}
			contractLoading={contractLoading}
			contract={contract}
			statusLabel={statusLabel}
		>
			<PageShell>
				<p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
					{t("clientProposes", { amount: formattedAmount })}
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
