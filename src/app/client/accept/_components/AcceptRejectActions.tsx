"use client";

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
	const busy = txStatus !== "idle";
	return (
		<>
			{!canRespond && (
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400 mb-4">
					Contract is not awaiting acceptance. It may already be accepted, rejected, or
					withdrawn.
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

			<div className="flex gap-3">
				<button
					type="button"
					onClick={onAccept}
					disabled={!canRespond || busy}
					className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
				>
					{busy && action === "accept"
						? txStatus === "approve-sending" || txStatus === "approve-confirming"
							? "Approving USDC…"
							: txStatus === "confirming"
								? "Confirming on-chain…"
								: "Waiting for wallet…"
						: isToken
							? `Approve & Fund (${formattedAmount})`
							: `Accept & Fund (${formattedAmount})`}
				</button>
				<button
					type="button"
					onClick={onReject}
					disabled={!canRespond || busy}
					className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold transition-colors"
				>
					{busy && action === "reject" ? "Rejecting…" : "Reject"}
				</button>
			</div>
		</>
	);
}
