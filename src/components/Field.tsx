"use client";

import { useId } from "react";

/**
 * Shared form primitives with built-in inline validation display.
 *
 * `Field` wraps a labelled control and renders a red error message (explaining
 * why the value is invalid and what is accepted) when `error` is set, otherwise
 * the muted `hint`. `Input`, `Select`, and `TextArea` accept an `error` boolean
 * that applies the red border treatment and sets `aria-invalid`.
 *
 * Example:
 *   <Field label="Amount (ETH)" hint="Held in escrow." error={amountError}>
 *     <Input type="number" error={amountError !== undefined} value={amount} … />
 *   </Field>
 */

const BASE_INPUT_CLASS =
	"rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition";
const INPUT_BG = "bg-gray-50 dark:bg-white/5";
const SELECT_BG = "bg-gray-100 dark:bg-gray-900";
const VALID_BORDER = "border border-gray-200 dark:border-white/10 focus:ring-indigo-500";
const ERROR_BORDER = "border border-red-500 dark:border-red-500 focus:ring-red-500";

function controlClass(bg: string, error: boolean): string {
	return `${BASE_INPUT_CLASS} ${bg} ${error ? ERROR_BORDER : VALID_BORDER}`;
}

interface FieldProps {
	label: string;
	hint?: string | undefined;
	/** Error message to show in red below the control; hides the hint when set. */
	error?: string | undefined;
	children: React.ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps): React.JSX.Element {
	const hasError = error !== undefined && error !== "";
	const hasHint = hint !== undefined && hint !== "";
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>
			{children}
			{hasError ? (
				<p className="text-xs text-red-500 dark:text-red-400" role="alert">
					{error}
				</p>
			) : hasHint ? (
				<p className="text-xs text-gray-500">{hint}</p>
			) : null}
		</div>
	);
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

// react-doctor-disable-next-line react-doctor/no-multi-comp
export function Input({ error = false, className, ...props }: InputProps): React.JSX.Element {
	const id = useId();
	return (
		<input
			id={props.id ?? id}
			aria-invalid={error}
			{...props}
			className={`${controlClass(INPUT_BG, error)}${className !== undefined && className !== "" ? ` ${className}` : ""}`}
		/>
	);
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean };

// react-doctor-disable-next-line react-doctor/no-multi-comp
export function Select({ error = false, className, ...props }: SelectProps): React.JSX.Element {
	return (
		<select
			aria-invalid={error}
			{...props}
			className={`${controlClass(SELECT_BG, error)}${className !== undefined && className !== "" ? ` ${className}` : ""}`}
		/>
	);
}
