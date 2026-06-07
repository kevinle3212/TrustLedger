"use client";

interface Props {
	busy: boolean;
	action: "accept" | "reject" | null;
	isConfirming: boolean;
	onAccept: () => void;
	onReject: () => void;
	writeError: Error | null;
}

/** Accept/Decline button row plus inline write-error display. */
export function ActionButtons({
	busy,
	action,
	isConfirming,
	onAccept,
	onReject,
	writeError,
}: Props): React.JSX.Element {
	return (
		<>
			{writeError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
					{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
				</p>
			)}

			<div className="flex gap-3">
				<button
					type="button"
					onClick={onAccept}
					disabled={busy}
					className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
				>
					{busy && action === "accept"
						? isConfirming
							? "Confirming on-chain…"
							: "Waiting for wallet…"
						: "Accept Offer"}
				</button>
				<button
					type="button"
					onClick={onReject}
					disabled={busy}
					className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200 font-semibold transition-colors"
				>
					{busy && action === "reject" ? "Rejecting…" : "Decline"}
				</button>
			</div>
		</>
	);
}
