"use client";

import { useState } from "react";

export function ChainModePreviewToggle(): React.JSX.Element {
	const [mode, setMode] = useState<"evm" | "solana">("evm");

	return (
		<div className="mt-4 max-w-xl rounded-2xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-gray-950">
			<div className="grid grid-cols-2 gap-1 text-xs font-semibold">
				<button
					type="button"
					onClick={() => {
						setMode("evm");
					}}
					aria-pressed={mode === "evm"}
					className={`rounded-xl px-3 py-2 transition-colors ${
						mode === "evm"
							? "bg-indigo-600 text-white"
							: "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
					}`}
				>
					EVM Escrow Live
				</button>
				<button
					type="button"
					onClick={() => {
						setMode("solana");
					}}
					aria-pressed={mode === "solana"}
					className={`rounded-xl px-3 py-2 transition-colors ${
						mode === "solana"
							? "bg-emerald-600 text-white"
							: "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
					}`}
				>
					Solana Devnet Preview
				</button>
			</div>
			<p className="px-3 py-2 text-xs leading-5 text-gray-600 dark:text-gray-300">
				{mode === "evm"
					? "Use the current Ethereum Sepolia escrow flow for real contract proposals and testing."
					: "Use Solana Devnet preview mode for SOL-denominated drafts and native-program metadata before submitting through the Solana flow."}
			</p>
		</div>
	);
}
