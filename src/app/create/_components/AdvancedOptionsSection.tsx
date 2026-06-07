"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import type { FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
}

/** Advanced Options card — arbitration fee, warranty hold-back, and warranty period. */
export function AdvancedOptionsSection({
	form,
	set,
	showError,
	markTouched,
}: Props): React.JSX.Element {
	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white">Advanced Options</h2>

			<Field
				label="Arbitration Fee (%)"
				hint="Percentage of escrow set aside for jurors if a dispute is opened (0-50%)."
				error={showError("arbitrationFeePct")}
			>
				<Input
					type="number"
					min="0"
					max="50"
					step="0.5"
					value={form.arbitrationFeePct}
					onChange={(e) => {
						set("arbitrationFeePct", e.target.value);
					}}
					onBlur={() => {
						markTouched("arbitrationFeePct");
					}}
					error={showError("arbitrationFeePct") !== undefined}
					required
				/>
			</Field>

			<Field
				label="Warranty Hold-back"
				hint="Portion withheld from the freelancer until the warranty period elapses."
			>
				<Select
					value={form.holdBack}
					onChange={(e) => {
						set("holdBack", e.target.value);
					}}
				>
					<option value="none">None</option>
					<option value="5">5%</option>
					<option value="10">10%</option>
					<option value="15">15%</option>
				</Select>
			</Field>

			{form.holdBack !== "none" && (
				<Field
					label="Warranty Period (days)"
					hint="How long the hold-back is locked after work is approved."
					error={showError("warrantyPeriodDays")}
				>
					<Input
						type="number"
						min="1"
						value={form.warrantyPeriodDays}
						onChange={(e) => {
							set("warrantyPeriodDays", e.target.value);
						}}
						onBlur={() => {
							markTouched("warrantyPeriodDays");
						}}
						error={showError("warrantyPeriodDays") !== undefined}
						required
					/>
				</Field>
			)}
		</div>
	);
}
