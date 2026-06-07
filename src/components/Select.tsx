"use client";

import { useContext } from "react";

import { controlClass, FieldIdContext, SELECT_BG } from "@/components/Field";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean };

/** `<select>` that integrates with the surrounding `Field` for label binding and error styling. */
export function Select({ error = false, className, ...props }: SelectProps): React.JSX.Element {
	const fieldId = useContext(FieldIdContext);
	return (
		<select
			id={props.id ?? fieldId}
			aria-invalid={error}
			{...props}
			className={`${controlClass(SELECT_BG, error)}${className !== undefined && className !== "" ? ` ${className}` : ""}`}
		/>
	);
}
