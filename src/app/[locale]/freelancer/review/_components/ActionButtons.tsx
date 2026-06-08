"use client";

import { useTranslations } from "next-intl";

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
	const t = useTranslations("Freelancer");

	return (
		<>
			{writeError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
					{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
				</p>
			)}

			<div className="flex flex-col gap-3 sm:flex-row">
				<button
					type="button"
					onClick={onAccept}
					disabled={busy}
					className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{busy && action === "accept"
						? isConfirming
							? t("confirmingOnChain")
							: t("waitingForWallet")
						: t("acceptOffer")}
				</button>
				<button
					type="button"
					onClick={onReject}
					disabled={busy}
					className="min-h-11 rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
				>
					{busy && action === "reject" ? t("rejecting") : t("decline")}
				</button>
			</div>
		</>
	);
}
