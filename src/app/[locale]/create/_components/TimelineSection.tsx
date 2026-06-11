"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { useTranslations } from "next-intl";
import type { FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
}

function dateTimeLocalValueFromDays(daysValue: string): string {
	const days = Number(daysValue);
	const normalizedDays = Number.isFinite(days) && days >= 2 ? days : 2;
	const date = new Date(Date.now() + normalizedDays * 86_400_000);
	const offsetMs = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function daysFromDateTimeLocal(value: string): string {
	const target = new Date(value);
	const diffMs = target.getTime() - Date.now();
	if (Number.isNaN(target.getTime()) || diffMs <= 0) return "2";
	return String(Math.max(2, Math.ceil(diffMs / 86_400_000)));
}

/** Timeline card — estimated duration, buffer factor, and acceptance window. */
export function TimelineSection({ form, set, showError, markTouched }: Props): React.JSX.Element {
	const t = useTranslations("Create");

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white">{t("timelineTitle")}</h2>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field
					label={t("estimatedDuration")}
					hint={t("estimatedDurationHint")}
					error={showError("estimatedDurationDays")}
				>
					<Input
						type="number"
						min="1"
						value={form.estimatedDurationDays}
						onChange={(e) => {
							set("estimatedDurationDays", e.target.value);
						}}
						onBlur={() => {
							markTouched("estimatedDurationDays");
						}}
						error={showError("estimatedDurationDays") !== undefined}
						required
					/>
				</Field>

				<Field
					label={t("bufferFactor")}
					hint={t("bufferFactorHint")}
					error={showError("bufferFactor")}
				>
					<Input
						type="number"
						min="1000"
						step="100"
						value={form.bufferFactor}
						onChange={(e) => {
							set("bufferFactor", e.target.value);
						}}
						onBlur={() => {
							markTouched("bufferFactor");
						}}
						error={showError("bufferFactor") !== undefined}
						required
					/>
				</Field>
			</div>

			<Field
				label={t("acceptanceWindow")}
				hint={t("acceptanceWindowHint")}
				error={showError("acceptanceWindowDays")}
			>
				<div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-950">
					<div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
						<Input
							type="number"
							min="2"
							value={form.acceptanceWindowDays}
							onChange={(e) => {
								set("acceptanceWindowDays", e.target.value);
							}}
							onBlur={() => {
								markTouched("acceptanceWindowDays");
							}}
							error={showError("acceptanceWindowDays") !== undefined}
							required
						/>
						<input
							type="datetime-local"
							value={dateTimeLocalValueFromDays(form.acceptanceWindowDays)}
							min={dateTimeLocalValueFromDays("2")}
							onChange={(event) => {
								set(
									"acceptanceWindowDays",
									daysFromDateTimeLocal(event.target.value),
								);
								markTouched("acceptanceWindowDays");
							}}
							aria-label={t("acceptanceWindowDateTime")}
							aria-invalid={showError("acceptanceWindowDays") !== undefined}
							className="min-h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						{["2", "3", "7", "14"].map((days) => (
							<button
								key={days}
								type="button"
								onClick={() => {
									set("acceptanceWindowDays", days);
									markTouched("acceptanceWindowDays");
								}}
								className={`tl-button-motion rounded-lg border px-3 py-1.5 text-xs font-semibold ${
									form.acceptanceWindowDays === days
										? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200"
										: "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
								}`}
							>
								{t("daysButton", { days })}
							</button>
						))}
					</div>
				</div>
			</Field>
		</div>
	);
}
