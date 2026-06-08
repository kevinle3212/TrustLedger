"use client";

import type { DecodedContractError } from "@/lib/contractErrors";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

interface Props {
	amount: string;
	/** Payment token type. */
	token: "eth" | "usdc";
	estimatedDurationDays: string;
	bufferFactor: string;
	holdBack: "none" | "5" | "10" | "15";
	simError: Error | null;
	/** Decoded custom-error details from a simulation revert. */
	decodedSimError: DecodedContractError | null;
	/** Simulation pipeline stage. */
	simStatus: "idle" | "loading" | "ready";
	writeError: Error | null;
	/** Wallet/chain transaction lifecycle stage. */
	txStatus: "idle" | "pending" | "confirming";
	hasBlockingErrors: boolean;
	/** Whether the user has attempted to submit (triggers missing-field banner). */
	submitAttempted: boolean;
	/** Human-readable labels of fields that still have validation errors. */
	missingFieldLabels: string[];
	/** Proposer's role in the contract. */
	proposerRole: "freelancer" | "client";
}

/** Summary card, simulation/write errors, and the submit button. */
export function SubmitSummary({
	amount,
	token,
	estimatedDurationDays,
	bufferFactor,
	holdBack,
	simError,
	decodedSimError,
	simStatus,
	writeError,
	txStatus,
	hasBlockingErrors,
	submitAttempted,
	missingFieldLabels,
	proposerRole,
}: Props): React.JSX.Element {
	const t = useTranslations("Create");
	const locale = useLocale();
	const isUsdc = token === "usdc";
	const isClientProposing = proposerRole === "client";
	const tokenLabel = isUsdc ? "USDC" : "ETH";
	const deadlineDays = Math.round((Number(estimatedDurationDays) * Number(bufferFactor)) / 1000);
	const amountFormatter = useMemo(
		() => new Intl.NumberFormat(locale, { maximumFractionDigits: isUsdc ? 2 : 6 }),
		[locale, isUsdc],
	);

	/** Message to show for a simulation revert, preferring the decoded form. */
	const simErrorMessage: string | null = ((): string | null => {
		if (simError === null) return null;
		if (decodedSimError !== null) return decodedSimError.message;
		return (simError as { shortMessage?: string }).shortMessage ?? simError.message;
	})();

	return (
		<>
			{amount !== "" && (
				<div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm text-indigo-900 dark:text-indigo-100 flex flex-col gap-1">
					<p>
						<span className="text-indigo-700 dark:text-indigo-300">
							{t("escrowAmountSummary")}
						</span>{" "}
						<span className="text-gray-900 dark:text-white font-medium">
							{amountFormatter.format(Number(amount))} {tokenLabel}
						</span>
					</p>
					{isUsdc && (
						<p className="text-xs text-amber-600 dark:text-amber-400">
							{t("usdcApprovalNote")}
						</p>
					)}
					<p>
						<span className="text-gray-500 dark:text-gray-400">
							{t("deadlineLabel")}
						</span>{" "}
						<span className="text-gray-900 dark:text-white font-medium">
							{t("daysFromNow", { n: deadlineDays })}
						</span>
					</p>
					{holdBack !== "none" && (
						<p>
							<span className="text-gray-500 dark:text-gray-400">
								{t("holdBackLabel")}
							</span>{" "}
							<span className="text-gray-900 dark:text-white font-medium">
								{holdBack}% (
								{amountFormatter.format((Number(amount) * Number(holdBack)) / 100)}{" "}
								{tokenLabel})
							</span>
						</p>
					)}
				</div>
			)}

			{/* Missing-field banner — shown after the first submit attempt. */}
			{submitAttempted && missingFieldLabels.length > 0 && (
				<div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
					<p className="font-medium mb-1">{t("fixBefore")}</p>
					<ul className="list-disc list-inside space-y-0.5">
						{missingFieldLabels.map((label) => (
							<li key={label} className="capitalize">
								{label}
							</li>
						))}
					</ul>
				</div>
			)}

			{/* Simulation error — shown before MetaMask opens, surfaces revert reason. */}
			{simErrorMessage !== null && simStatus !== "idle" && (
				<div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 dark:text-red-400">
					<p className="font-medium mb-0.5">{t("transactionWouldRevert")}</p>
					<p>{simErrorMessage}</p>
					{decodedSimError?.field !== undefined && (
						<p className="mt-1 text-xs opacity-75">
							{t("checkField", {
								field: decodedSimError.field
									.replace(/([A-Z])/g, " $1")
									.trim()
									.toLowerCase(),
							})}
						</p>
					)}
				</div>
			)}

			{writeError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
					{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
				</p>
			)}

			<button
				type="submit"
				disabled={
					txStatus !== "idle" ||
					hasBlockingErrors ||
					(simStatus === "loading" && simError === null)
				}
				className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
			>
				{txStatus === "pending"
					? t("waitingForWallet")
					: txStatus === "confirming"
						? t("confirmingOnChain")
						: isClientProposing
							? t("createContractOffer", { token: tokenLabel })
							: t("proposeEscrowContract")}
			</button>
		</>
	);
}
