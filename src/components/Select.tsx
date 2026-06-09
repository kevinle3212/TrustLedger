"use client";

import { use } from "react";

import { controlClass, FieldIdContext, SELECT_BG } from "@/components/Field";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean };

/** `<select>` that integrates with the surrounding `Field` for label binding and error styling. */
export function Select({ error = false, className, ...props }: SelectProps): React.JSX.Element {
	const fieldId = use(FieldIdContext);
	return (
		<select
			{...props}
			id={fieldId ?? props.id}
			aria-invalid={error}
			className={`${controlClass(SELECT_BG, error)}${className !== undefined && className !== "" ? ` ${className}` : ""}`}
		/>
	);
}
