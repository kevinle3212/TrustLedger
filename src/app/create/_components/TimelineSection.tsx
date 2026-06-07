"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import type { FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
}

/** Timeline card — estimated duration, buffer factor, and acceptance window. */
export function TimelineSection({ form, set, showError, markTouched }: Props): React.JSX.Element {
	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white">Timeline</h2>

			<div className="grid grid-cols-2 gap-4">
				<Field
					label="Estimated Duration (days)"
					hint="How long the project should take."
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
					label="Buffer Factor"
					hint="Project deadline = duration × buffer / 1000. E.g. 1200 = 1.2× buffer."
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
				label="Acceptance Window (days)"
				hint="How long you have to review submitted work. Minimum 2 days."
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
