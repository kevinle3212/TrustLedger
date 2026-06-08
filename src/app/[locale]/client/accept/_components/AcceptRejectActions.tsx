"use client";

import { useTranslations } from "next-intl";

interface Props {
	/** Wallet/chain transaction lifecycle stage. */
	txStatus: "idle" | "sending" | "approve-sending" | "approve-confirming" | "confirming";
	action: "accept" | "reject" | null;
	canRespond: boolean;
	isToken: boolean;
	formattedAmount: string;
	onAccept: () => void;
	onReject: () => void;
	approveError: Error | null;
	writeError: Error | null;
}

/** Accept/Reject button pair with USDC-aware loading states and inline error display. */
export function AcceptRejectActions({
	txStatus,
	action,
	canRespond,
	isToken,
	formattedAmount,
	onAccept,
	onReject,
	approveError,
	writeError,
}: Props): React.JSX.Element {
	const t = useTranslations("Client");
	const busy = txStatus !== "idle";
	return (
		<>
			{!canRespond && (
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 mb-4">
					{t("notAwaiting")}
				</div>
			)}

			{approveError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
					{(approveError as { shortMessage?: string }).shortMessage ??
						approveError.message}
				</p>
			)}
			{writeError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
					{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
				</p>
			)}

			<div className="flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					onClick={onAccept}
					disabled={!canRespond || busy}
					className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{busy && action === "accept"
						? txStatus === "approve-sending" || txStatus === "approve-confirming"
							? t("approvingUsdc")
							: txStatus === "confirming"
								? t("confirmingOnChain")
								: t("waitingForWallet")
						: isToken
							? t("approveFund", { amount: formattedAmount })
							: t("acceptFund", { amount: formattedAmount })}
				</button>
				<button
					type="button"
					onClick={onReject}
					disabled={!canRespond || busy}
					className="min-h-11 rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
				>
					{busy && action === "reject" ? t("rejecting") : t("reject")}
				</button>
			</div>
		</>
	);
}
