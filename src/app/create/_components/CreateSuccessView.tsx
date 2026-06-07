"use client";

import { useChainId } from "wagmi";
import { getExplorerTxUrl } from "@/lib/wagmi";

interface Props {
	txHash: `0x${string}` | undefined;
	blockNumber: bigint;
	isClientProposing: boolean;
	clientEmail: string;
	magicLinkStatus: "idle" | "sending" | "sent" | "error";
	onCreateAnother: () => void;
}

/** Full-page success state rendered after the transaction is confirmed on-chain. */
export function CreateSuccessView({
	txHash,
	blockNumber,
	isClientProposing,
	clientEmail,
	magicLinkStatus,
	onCreateAnother,
}: Props): React.JSX.Element {
	const chainId = useChainId();

	return (
		<div className="max-w-lg mx-auto px-6 py-24 flex flex-col items-center gap-6 text-center">
			<div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
				<svg
					className="w-8 h-8 text-green-500 dark:text-green-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>
			<h2 className="text-2xl font-bold">
				{isClientProposing ? "Contract Offer Created!" : "Contract Proposed!"}
			</h2>
			<p className="text-gray-500 dark:text-gray-400 text-sm">
				Transaction confirmed in block {blockNumber.toString()}.
				{isClientProposing &&
					" The freelancer will review and accept. You will then be prompted to fund the escrow to start the project."}
			</p>
			<a
				href={getExplorerTxUrl(chainId, txHash ?? "")}
				target="_blank"
				rel="noopener noreferrer"
				className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm underline underline-offset-2"
			>
				View on explorer
			</a>
			{clientEmail !== "" && (
				<p className="text-sm">
					{magicLinkStatus === "sending" && (
						<span className="text-gray-500 dark:text-gray-400">
							Sending magic link…
						</span>
					)}
					{magicLinkStatus === "sent" && (
						<span className="text-green-500 dark:text-green-400">
							{isClientProposing ? "Review link" : "Magic link"} sent to {clientEmail}
						</span>
					)}
					{magicLinkStatus === "error" && (
						<span className="text-red-500 dark:text-red-400">
							Failed to send magic link - check server env vars.
						</span>
					)}
				</p>
			)}
			<button
				type="button"
				onClick={onCreateAnother}
				className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
			>
				Create Another
			</button>
		</div>
	);
}
