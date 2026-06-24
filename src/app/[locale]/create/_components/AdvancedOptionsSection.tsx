"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
}

const HOLD_BACK_OPTIONS = [
	{ value: "none", labelKey: "holdbackNone" },
	{ value: "5", labelKey: null },
	{ value: "10", labelKey: null },
	{ value: "15", labelKey: null },
] as const satisfies readonly {
	readonly value: FormFields["holdBack"];
	readonly labelKey: "holdbackNone" | null;
}[];

function HoldBackMenu({
	value,
	onChange,
}: {
	readonly value: FormFields["holdBack"];
	readonly onChange: (value: FormFields["holdBack"]) => void;
}): React.JSX.Element {
	const t = useTranslations("Create");
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const selected =
		HOLD_BACK_OPTIONS.find((option) => option.value === value) ?? HOLD_BACK_OPTIONS[0];
	const selectedLabel = selected.labelKey === null ? `${selected.value}%` : t(selected.labelKey);
	const holdBackDetail = (option: (typeof HOLD_BACK_OPTIONS)[number]): string =>
		option.value === "none"
			? t("holdbackDetailNone")
			: t("holdbackDetailPercent", { percent: option.value });

	useEffect(() => {
		function closeOnOutsideClick(event: MouseEvent): void {
			if (
				rootRef.current !== null &&
				event.target instanceof Node &&
				!rootRef.current.contains(event.target)
			) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", closeOnOutsideClick);
		return (): void => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
		};
	}, []);

	return (
		<div ref={rootRef} className="tl-choice-menu">
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				className="tl-choice-menu__button"
				onClick={() => {
					setOpen((current) => !current);
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape") setOpen(false);
				}}
			>
				<span className="tl-choice-menu__main">
					<span className="tl-choice-menu__label">{selectedLabel}</span>
					<span className="tl-choice-menu__detail">{holdBackDetail(selected)}</span>
				</span>
				<span className="tl-choice-menu__chevron" aria-hidden="true">
					⌄
				</span>
			</button>
			{open && (
				<ul className="tl-choice-menu__menu" aria-label={t("warrantyHoldback")}>
					{HOLD_BACK_OPTIONS.map((option) => {
						const optionLabel =
							option.labelKey === null ? `${option.value}%` : t(option.labelKey);
						const selectedOption = option.value === value;
						return (
							<li key={option.value}>
								<button
									type="button"
									aria-current={selectedOption ? "true" : undefined}
									className="tl-choice-menu__option"
									onClick={() => {
										onChange(option.value);
										setOpen(false);
									}}
								>
									<span>
										<span className="tl-choice-menu__option-label">
											{optionLabel}
										</span>
										<span className="tl-choice-menu__option-detail">
											{holdBackDetail(option)}
										</span>
									</span>
									<span className="tl-choice-menu__check" aria-hidden="true">
										{selectedOption ? "✓" : ""}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/** Advanced Options card — arbitration fee, warranty hold-back, and warranty period. */
export function AdvancedOptionsSection({
	form,
	set,
	showError,
	markTouched,
}: Props): React.JSX.Element {
	const t = useTranslations("Create");

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white">
				{t("advancedOptionsTitle")}
			</h2>

			<Field
				label={t("arbitrationFee")}
				hint={t("arbitrationFeeHint")}
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

			<Field label={t("warrantyHoldback")} hint={t("warrantyHoldbackHint")}>
				<HoldBackMenu
					value={form.holdBack}
					onChange={(nextValue) => {
						set("holdBack", nextValue);
					}}
				/>
			</Field>

			{form.holdBack !== "none" && (
				<Field
					label={t("warrantyPeriod")}
					hint={t("warrantyPeriodHint")}
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
