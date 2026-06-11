"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDeadlineWithRelativeDays } from "@/lib/utils";
import { getPaymentTokenLabel, getPaymentTokenMaximumFractionDigits } from "../_lib/paymentToken";
import type { ContractTermsFormat, FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	paymentToken: "eth" | "usdc" | "sol";
	isClientProposing: boolean;
	termsBody: string;
	termsFormat: ContractTermsFormat;
	termsLastUpdatedAt: string | null;
}

function fallback(value: string, label: string): string {
	const trimmed = value.trim();
	return trimmed === "" ? label : trimmed;
}

function formatTermsMode(format: ContractTermsFormat): string {
	if (format === "html") return "HTML";
	if (format === "plain") return "Plain Text";
	return "Markdown";
}

function summarizeTerms(value: string): {
	readonly sectionCount: number;
	readonly wordCount: number;
	readonly firstClause: string;
} {
	const text = value
		.replace(/<[^>]*>/gu, " ")
		.replace(/[#>*_`[\]()!]/gu, " ")
		.replace(/\s+/gu, " ")
		.trim();
	const wordCount = text === "" ? 0 : text.split(/\s+/u).length;
	const sectionCount = Math.max(
		value.match(/^#{1,6}\s+/gmu)?.length ?? 0,
		value.match(/<h[1-6][\s>]/giu)?.length ?? 0,
	);
	const firstClause = text === "" ? "" : (text.split(/(?<=[.!?])\s+/u)[0] ?? text);
	return { sectionCount, wordCount, firstClause };
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
	const token = getPaymentTokenLabel(paymentToken);
	const numericAmount = Number(form.amount);
	const maximumFractionDigits = getPaymentTokenMaximumFractionDigits(paymentToken);
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
	const termsSummary = useMemo(() => summarizeTerms(termsBody), [termsBody]);
	const lastUpdated =
		termsLastUpdatedAt === null
			? t("previewNotSet")
			: dateTimeFormatter.format(new Date(termsLastUpdatedAt));

	return (
		<aside className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm transition-transform duration-300 dark:border-white/10 dark:bg-white/5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:scroll-smooth">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
					Live Preview
				</p>
				<h2 className="text-xl font-semibold tracking-[-0.015em] text-gray-900 dark:text-white">
					{t("previewTitle")}
				</h2>
				<p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("previewSubtitle")}
				</p>
			</div>

			<div className="tl-kv-grid mt-6 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-[inset_0_1px_0_rgb(255_255_255/0.8)] dark:border-white/10 dark:bg-gray-950">
				<span className="font-medium text-gray-500">Counterparty</span>
				<span className="font-mono text-xs text-gray-900 dark:text-white">
					{fallback(form.client, t("previewNotSet"))}
				</span>

				<span className="font-medium text-gray-500">Recipient Role</span>
				<span className="text-gray-900 dark:text-white">
					{isClientProposing ? t("isFreelancer") : t("isClient")}
				</span>

				<span className="font-medium text-gray-500">Escrow Amount</span>
				<span className="font-medium text-gray-900 dark:text-white">{amount}</span>

				<span className="font-medium text-gray-500">Contract Document</span>
				<span className="font-mono text-xs text-gray-900 dark:text-white">
					{fallback(form.contractURI, t("previewNotSet"))}
				</span>

				<span className="font-medium text-gray-500">Deadline</span>
				<span className="text-gray-900 dark:text-white">
					{projectDays > 0
						? formatDeadlineWithRelativeDays(
								projectDays,
								t("daysFromNow", { n: projectDays }),
							)
						: t("previewNotSet")}
				</span>

				<span className="font-medium text-gray-500">Acceptance Window</span>
				<span className="text-gray-900 dark:text-white">
					{form.acceptanceWindowDays.trim() === "" ? "0" : form.acceptanceWindowDays}{" "}
					{t("daysUnit")}
				</span>

				<span className="font-medium text-gray-500">Arbitration Fee</span>
				<span className="text-gray-900 dark:text-white">
					{form.arbitrationFeePct.trim() === "" ? "0" : form.arbitrationFeePct}%
				</span>

				<span className="font-medium text-gray-500">Warranty Hold-Back</span>
				<span className="text-gray-900 dark:text-white">{holdBack}</span>

				<span className="font-medium text-gray-500">Draft Terms Format</span>
				<span className="text-gray-900 dark:text-white">
					{formatTermsMode(termsFormat)}
				</span>

				<span className="font-medium text-gray-500">Last Updated</span>
				<span className="text-gray-900 dark:text-white">{lastUpdated}</span>
			</div>

			<div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
				<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
					Draft Contract Terms
				</p>
				<div className="mt-3 grid gap-3 text-sm">
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded-lg bg-gray-50 p-3 dark:bg-white/5">
							<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
								Sections
							</p>
							<p className="mt-1 font-semibold text-gray-950 dark:text-white">
								{termsSummary.sectionCount.toString()}
							</p>
						</div>
						<div className="rounded-lg bg-gray-50 p-3 dark:bg-white/5">
							<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
								Words
							</p>
							<p className="mt-1 font-semibold text-gray-950 dark:text-white">
								{termsSummary.wordCount.toString()}
							</p>
						</div>
					</div>
					<div>
						<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
							First Clause
						</p>
						<p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
							{termsSummary.firstClause === ""
								? t("previewNotSet")
								: termsSummary.firstClause.slice(0, 220)}
							{termsSummary.firstClause.length > 220 ? "..." : ""}
						</p>
					</div>
				</div>
			</div>

			<p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
				{t("draftSavedNote")} Do Not Clear Cookies Or Browser Cache Until You Finish,
				Because That Resets Local Draft Progress.
			</p>
		</aside>
	);
}
