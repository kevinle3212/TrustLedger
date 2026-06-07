"use client";

import type { ArweaveJWK } from "@/lib/arweave";

type UploadStatus = "idle" | "working" | "done" | "error";

interface Props {
	arweaveWallet: ArweaveJWK | null;
	arweaveStatus: UploadStatus;
	arweaveUri: string;
	arweaveBalance: string | null;
	onArweaveWalletLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onArweaveUpload: () => void;
}

/** Permanent Arweave backup panel shown after a successful IPFS upload. */
export function ArweaveBackupPanel({
	arweaveWallet,
	arweaveStatus,
	arweaveUri,
	arweaveBalance,
	onArweaveWalletLoad,
	onArweaveUpload,
}: Props): React.JSX.Element {
	return (
		<div className="flex flex-col gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
			<p className="text-xs text-gray-500">
				Permanent backup to Arweave (optional - for long-term legal retention)
			</p>

			{arweaveStatus === "idle" && (
				<div className="flex items-center gap-3">
					<label className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2">
						<input
							type="file"
							accept=".json"
							className="sr-only"
							onChange={onArweaveWalletLoad}
						/>
						{arweaveWallet !== null ? "Wallet loaded" : "Load Arweave wallet (.json)"}
					</label>
					{arweaveWallet !== null && (
						<>
							{arweaveBalance !== null && (
								<span className="text-xs text-gray-500">{arweaveBalance} AR</span>
							)}
							<button
								type="button"
								onClick={onArweaveUpload}
								className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
							>
								Upload to Arweave
							</button>
						</>
					)}
				</div>
			)}
			{arweaveStatus === "working" && (
				<span className="text-xs text-gray-500">Uploading to Arweave…</span>
			)}
			{arweaveStatus === "done" && arweaveUri !== "" && (
				<span className="text-xs text-green-500 dark:text-green-400 font-mono break-all">
					✓ {arweaveUri}
				</span>
			)}
			{arweaveStatus === "error" && (
				<span className="text-xs text-red-500 dark:text-red-400">
					Arweave upload failed - check wallet balance.
				</span>
			)}
		</div>
	);
}
