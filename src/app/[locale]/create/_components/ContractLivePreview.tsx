"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	paymentToken: "eth" | "usdc";
	isClientProposing: boolean;
}

function fallback(value: string, label: string): string {
	const trimmed = value.trim();
	return trimmed === "" ? label : trimmed;
}

export function ContractLivePreview({
	form,
	paymentToken,
	isClientProposing,
}: Props): React.JSX.Element {
	const t = useTranslations("Create");
	const locale = useLocale();
	const token = paymentToken === "usdc" ? "USDC" : "ETH";
	const numericAmount = Number(form.amount);
	const maximumFractionDigits = paymentToken === "usdc" ? 2 : 6;
	const amountFormatter = useMemo(
		() => new Intl.NumberFormat(locale, { maximumFractionDigits }),
		[locale, maximumFractionDigits],
	);
	const amount =
		form.amount.trim() === "" || !Number.isFinite(numericAmount)
			? t("previewNotSet")
			: `${amountFormatter.format(numericAmount)} ${token}`;
	const estimatedDurationDays =
		form.estimatedDurationDays.trim() === "" ? "0" : form.estimatedDurationDays;
	const bufferFactor = form.bufferFactor.trim() === "" ? "0" : form.bufferFactor;
	const projectDays = Math.round((Number(estimatedDurationDays) * Number(bufferFactor)) / 1000);
	const warrantyPeriodDays =
		form.warrantyPeriodDays.trim() === "" ? "0" : form.warrantyPeriodDays;
	const holdBack =
		form.holdBack === "none"
			? t("holdbackNone")
			: `${form.holdBack}% for ${warrantyPeriodDays} ${t("daysUnit")}`;

	return (
		<aside className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5 lg:sticky lg:top-24">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
					{t("livePreview")}
				</p>
				<h2 className="text-xl font-semibold tracking-[-0.015em] text-gray-900 dark:text-white">
					{t("previewTitle")}
				</h2>
				<p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("previewSubtitle")}
				</p>
			</div>

			<div className="tl-kv-grid mt-6 text-sm">
				<span className="text-gray-500">{t("counterparty")}</span>
				<span className="font-mono text-xs text-gray-900 dark:text-white">
					{fallback(form.client, t("previewNotSet"))}
				</span>

				<span className="text-gray-500">{t("recipientRole")}</span>
				<span className="text-gray-900 dark:text-white">
					{isClientProposing ? t("isFreelancer") : t("isClient")}
				</span>

				<span className="text-gray-500">{t("escrowAmountSummary")}</span>
				<span className="font-medium text-gray-900 dark:text-white">{amount}</span>

				<span className="text-gray-500">{t("contractDocumentTitle")}</span>
				<span className="font-mono text-xs text-gray-900 dark:text-white">
					{fallback(form.contractURI, t("previewNotSet"))}
				</span>

				<span className="text-gray-500">{t("deadlineLabel")}</span>
				<span className="text-gray-900 dark:text-white">
					{projectDays > 0 ? t("daysFromNow", { n: projectDays }) : t("previewNotSet")}
				</span>

				<span className="text-gray-500">{t("acceptanceWindow")}</span>
				<span className="text-gray-900 dark:text-white">
					{form.acceptanceWindowDays.trim() === "" ? "0" : form.acceptanceWindowDays}{" "}
					{t("daysUnit")}
				</span>

				<span className="text-gray-500">{t("arbitrationFee")}</span>
				<span className="text-gray-900 dark:text-white">
					{form.arbitrationFeePct.trim() === "" ? "0" : form.arbitrationFeePct}%
				</span>

				<span className="text-gray-500">{t("warrantyHoldback")}</span>
				<span className="text-gray-900 dark:text-white">{holdBack}</span>
			</div>

			<p className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-gray-600 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300">
				{t("draftSavedNote")}
			</p>
		</aside>
	);
}
