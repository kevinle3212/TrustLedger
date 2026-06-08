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
			</Field>
		</div>
	);
}
