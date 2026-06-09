"use client";

import { use, useId } from "react";

import { controlClass, FieldIdContext, INPUT_BG } from "@/components/Field";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

/** Text/number/etc. input that integrates with the surrounding `Field` for label binding and error styling. */
export function Input({ error = false, className, ...props }: InputProps): React.JSX.Element {
	const generatedId = useId();
	const fieldId = use(FieldIdContext);
	const id = fieldId ?? props.id ?? generatedId;
	return (
		<input
			{...props}
			id={id}
			aria-invalid={error}
			className={`${controlClass(INPUT_BG, error)}${className !== undefined && className !== "" ? ` ${className}` : ""}`}
		/>
	);
}
