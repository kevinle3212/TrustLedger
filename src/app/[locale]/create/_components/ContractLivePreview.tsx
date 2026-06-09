"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ContractTermsFormat, FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	paymentToken: "eth" | "usdc";
	isClientProposing: boolean;
	termsBody: string;
	termsFormat: ContractTermsFormat;
	termsLastUpdatedAt: string | null;
}

function fallback(value: string, label: string): string {
	const trimmed = value.trim();
	return trimmed === "" ? label : trimmed;
}

export function ContractLivePreview({
	form,
	paymentToken,
	isClientProposing,
	termsBody,
	termsFormat,
	termsLastUpdatedAt,
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
	const dateTimeFormatter = useMemo(
		() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
		[locale],
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
	const termsExcerpt =
		termsBody.trim() === ""
			? t("previewNotSet")
			: termsBody.trim().replace(/\s+/g, " ").slice(0, 180);
	const lastUpdated =
		termsLastUpdatedAt === null
			? t("previewNotSet")
			: dateTimeFormatter.format(new Date(termsLastUpdatedAt));

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

				<span className="text-gray-500">Terms format</span>
				<span className="capitalize text-gray-900 dark:text-white">{termsFormat}</span>

				<span className="text-gray-500">Last updated</span>
				<span className="text-gray-900 dark:text-white">{lastUpdated}</span>
			</div>

			<div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
				<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
					Editable terms excerpt
				</p>
				<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{termsExcerpt}
					{termsBody.trim().length > 180 ? "..." : ""}
				</p>
			</div>

			<p className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs leading-5 text-gray-600 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300">
				{t("draftSavedNote")}
			</p>
		</aside>
	);
}
