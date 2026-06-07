"use client";

import { DecryptDocumentForm } from "@/components/DecryptDocumentForm";
import { formatTokenAmount, resolveDocUrl } from "@/lib/utils";

function Row({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="flex justify-between gap-4">
			<span className="text-gray-500 shrink-0">{label}</span>
			<span
				className={`text-right truncate ${mono ? "font-mono text-xs text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}
			>
				{value}
			</span>
		</div>
	);
}

interface ContractData {
	status: number;
	client: string;
	freelancer: string;
	amount: bigint;
	token: string;
	projectDeadline: bigint;
	holdBackBps: number;
	contractURI: string;
}

interface Props {
	contract: ContractData;
	statusLabel: string;
	isToken: boolean;
	decryptOpen: boolean;
	onToggleDecrypt: () => void;
}

/** Detail card showing contract fields, currency type, and an optional inline decrypt panel. */
export function ContractDetailPanel({
	contract,
	statusLabel,
	isToken,
	decryptOpen,
	onToggleDecrypt,
}: Props): React.JSX.Element {
	const docUrl = resolveDocUrl(contract.contractURI);

	return (
		<>
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3 text-sm mb-6">
				<Row label="Status" value={statusLabel} />
				<Row label="Client" value={contract.client} mono />
				<Row label="Freelancer" value={contract.freelancer} mono />
				<Row label="Amount" value={formatTokenAmount(contract.amount, contract.token)} />
				<Row label="Currency" value={isToken ? "USDC" : "ETH"} />
				<Row
					label="Deadline"
					value={
						contract.projectDeadline > 0n
							? `~${String(Math.round(Number(contract.projectDeadline) / 86400))} days after acceptance`
							: "Set on acceptance"
					}
				/>
				{contract.holdBackBps > 0 && (
					<Row label="Hold-back" value={`${String(contract.holdBackBps / 100)}%`} />
				)}
				{docUrl !== undefined && (
					<Row
						label="Document"
						value={
							<span className="flex items-center justify-end gap-2">
								<a
									href={docUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
								>
									View
								</a>
								<span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
								<button
									type="button"
									onClick={onToggleDecrypt}
									className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
								>
									{decryptOpen ? "Hide decrypt" : "Decrypt"}
								</button>
							</span>
						}
					/>
				)}
			</div>

			{/* Decrypt-and-view panel for AES-256-GCM encrypted documents. */}
			{docUrl !== undefined && decryptOpen && (
				<div className="mb-6">
					<DecryptDocumentForm gatewayUrl={docUrl} onClose={onToggleDecrypt} />
				</div>
			)}
		</>
	);
}
