"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FormFields } from "../_lib/types";

interface Props {
	open: boolean;
	form: FormFields;
	paymentToken: "eth" | "usdc";
	isClientProposing: boolean;
	txReady: boolean;
	txStatus: "idle" | "pending" | "confirming";
	onCancel: () => void;
	onConfirm: () => void;
}

export function ReviewConfirmationPanel({
	open,
	form,
	paymentToken,
	isClientProposing,
	txReady,
	txStatus,
	onCancel,
	onConfirm,
}: Props): React.JSX.Element | null {
	const t = useTranslations("Create");
	const locale = useLocale();
	const token = paymentToken === "usdc" ? "USDC" : "ETH";
	const maximumFractionDigits = paymentToken === "usdc" ? 2 : 6;
	const amountFormatter = useMemo(
		() => new Intl.NumberFormat(locale, { maximumFractionDigits }),
		[locale, maximumFractionDigits],
	);
	const recipientRole = isClientProposing ? t("isFreelancer") : t("isClient");
	const amount = amountFormatter.format(Number(form.amount));
	const projectDays = Math.round(
		(Number(form.estimatedDurationDays) * Number(form.bufferFactor)) / 1000,
	);

	if (!open) return null;

	return (
		<section className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5">
			<div className="flex flex-col gap-2">
				<p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
					{t("reviewBeforeDeploy")}
				</p>
				<h2 className="text-xl font-semibold tracking-[-0.015em] text-gray-900 dark:text-white">
					{t("confirmSendQuestion", { role: recipientRole.toLowerCase() })}
				</h2>
				<p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("confirmSendDescription")}
				</p>
			</div>

			<div className="tl-kv-grid mt-5 text-sm">
				<span className="text-gray-500">{t("counterparty")}</span>
				<span className="font-mono text-xs text-gray-900 dark:text-white">
					{form.client}
				</span>

				<span className="text-gray-500">{t("escrowAmountSummary")}</span>
				<span className="font-medium text-gray-900 dark:text-white">
					{amount} {token}
				</span>

				<span className="text-gray-500">{t("deadlineLabel")}</span>
				<span className="text-gray-900 dark:text-white">
					{t("daysFromNow", { n: projectDays })}
				</span>

				<span className="text-gray-500">{t("contractDocumentTitle")}</span>
				<span className="font-mono text-xs text-gray-900 dark:text-white">
					{form.contractURI}
				</span>
			</div>

			<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
				<button
					type="button"
					onClick={onCancel}
					disabled={txStatus !== "idle"}
					className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
				>
					{t("keepEditing")}
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={!txReady || txStatus !== "idle"}
					className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{txStatus === "pending"
						? t("waitingForWallet")
						: txStatus === "confirming"
							? t("confirmingOnChain")
							: t("confirmAndSend")}
				</button>
			</div>
		</section>
	);
}
