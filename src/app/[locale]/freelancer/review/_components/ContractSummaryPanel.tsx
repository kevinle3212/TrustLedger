"use client";

import { DecryptDocumentForm } from "@/components/DecryptDocumentForm";
import { useLocale, useTranslations } from "next-intl";
import { formatTokenAmount, resolveDocUrl } from "@/lib/utils";

function Row({
	label,
	value,
	mono,
}: {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="grid gap-1 sm:grid-cols-[minmax(8rem,0.9fr)_minmax(0,1.1fr)] sm:gap-4">
			<span className="text-gray-500">{label}</span>
			<span
				className={`min-w-0 [overflow-wrap:anywhere] text-gray-900 dark:text-white sm:text-right ${mono === true ? "font-mono text-xs" : ""}`}
			>
				{value}
			</span>
		</div>
	);
}

interface ContractData {
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
	decryptOpen: boolean;
	onToggleDecrypt: () => void;
}

/** Detail card showing contract fields plus an optional inline decrypt panel. */
export function ContractSummaryPanel({
	contract,
	statusLabel,
	decryptOpen,
	onToggleDecrypt,
}: Props): React.JSX.Element {
	const t = useTranslations("Freelancer");
	const locale = useLocale();
	const docUrl = resolveDocUrl(contract.contractURI);

	return (
		<>
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3 text-sm mb-6">
				<Row label={t("status")} value={statusLabel} />
				<Row label={t("client")} value={contract.client} mono />
				<Row label={t("freelancer")} value={contract.freelancer} mono />
				<Row
					label={t("amount")}
					value={formatTokenAmount(contract.amount, contract.token, locale)}
				/>
				<Row
					label={t("deadline")}
					value={
						contract.projectDeadline > 0n
							? t("daysFromAcceptance", {
									days: Math.round(Number(contract.projectDeadline) / 86400),
								})
							: t("setOnAcceptance")
					}
				/>
				{contract.holdBackBps > 0 && (
					<Row label={t("holdBack")} value={`${String(contract.holdBackBps / 100)}%`} />
				)}
				{docUrl !== undefined && (
					<Row
						label={t("document")}
						value={
							<span className="flex items-center justify-end gap-2">
								<a
									href={docUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
								>
									{t("view")}
								</a>
								<span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
								<button
									type="button"
									onClick={onToggleDecrypt}
									className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
								>
									{decryptOpen ? t("hideDecrypt") : t("decrypt")}
								</button>
							</span>
						}
					/>
				)}
			</div>

			{docUrl !== undefined && decryptOpen && (
				<div className="mb-6">
					<DecryptDocumentForm gatewayUrl={docUrl} onClose={onToggleDecrypt} />
				</div>
			)}
		</>
	);
}
