"use client";

import { createContext, useId } from "react";

/** Provides the generated field id so `Input`/`Select` can bind to the wrapping `Field` label. */
export const FieldIdContext = createContext<string | undefined>(undefined);

export const BASE_INPUT_CLASS =
	"rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition";
export const INPUT_BG = "bg-gray-50 dark:bg-white/5";
export const SELECT_BG = "bg-gray-100 dark:bg-gray-900";
const VALID_BORDER = "border border-gray-200 dark:border-white/10 focus:ring-indigo-500";
const ERROR_BORDER = "border border-red-500 dark:border-red-500 focus:ring-red-500";

/** Returns the Tailwind class string for a form control given its background and error state. */
export function controlClass(bg: string, error: boolean): string {
	return `${BASE_INPUT_CLASS} ${bg} ${error ? ERROR_BORDER : VALID_BORDER}`;
}

interface FieldProps {
	label: string;
	hint?: string | undefined;
	/** Error message to show in red below the control; hides the hint when set. */
	error?: string | undefined;
	children: React.ReactNode;
}

/**
 * Shared form primitive that wraps a labelled control with inline validation display.
 *
 * Renders a red error message when `error` is set, otherwise the muted `hint`.
 * Passes a generated id via context so child `Input`/`Select` components bind
 * automatically to this label.
 *
 * Example:
 *   <Field label="Amount (ETH)" hint="Held in escrow." error={amountError}>
 *     <Input type="number" error={amountError !== undefined} value={amount} … />
 *   </Field>
 */
export function Field({ label, hint, error, children }: FieldProps): React.JSX.Element {
	const fieldId = useId();
	const hasError = error !== undefined && error !== "";
	const hasHint = hint !== undefined && hint !== "";
	return (
		<FieldIdContext.Provider value={fieldId}>
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor={fieldId}
					className="text-sm font-medium text-gray-700 dark:text-gray-200"
				>
					{label}
				</label>
				{children}
				{hasError ? (
					<p className="text-xs text-red-500 dark:text-red-400" role="alert">
						{error}
					</p>
				) : hasHint ? (
					<p className="text-xs text-gray-500">{hint}</p>
				) : null}
			</div>
		</FieldIdContext.Provider>
	);
}
