"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Inline prompt for the sign-in TOTP step-up: rendered by a page while
 * `useAccountSession()`'s `status` is `"totp-required"`. Submits the 6-digit
 * authenticator code via `onSubmit` (typically `promptTotp` from the hook).
 *
 * Uses a native `<dialog>` (opened via `showModal()`) so keyboard users get
 * built-in focus trapping, `Escape`-to-cancel, and a backdrop for free.
 */
export function TotpStepUpPrompt({
	onSubmit,
	onCancel,
	error,
}: {
	readonly onSubmit: (code: string) => void;
	readonly onCancel: () => void;
	readonly error: string | null;
}): React.JSX.Element {
	const t = useTranslations("Common");
	const [code, setCode] = useState("");
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		dialog?.showModal();
		return (): void => {
			dialog?.close();
		};
	}, []);

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="totp-step-up-title"
			onCancel={(event) => {
				event.preventDefault();
				onCancel();
			}}
			className="tl-motion-card m-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-5 backdrop:bg-black/40 dark:border-white/10 dark:bg-gray-950"
		>
			<h2
				id="totp-step-up-title"
				className="text-lg font-semibold text-gray-950 dark:text-white"
			>
				{t("totpPromptTitle")}
			</h2>
			<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
				{t("totpPromptBody")}
			</p>
			<form
				className="mt-4 flex flex-col gap-3"
				action={() => {
					onSubmit(code);
				}}
			>
				<label htmlFor="totp-step-up-code" className="sr-only">
					{t("totpPromptPlaceholder")}
				</label>
				<input
					id="totp-step-up-code"
					name="totp-step-up-code"
					type="text"
					inputMode="numeric"
					autoComplete="one-time-code"
					maxLength={6}
					placeholder={t("totpPromptPlaceholder")}
					value={code}
					onChange={(event) => {
						setCode(event.target.value.replace(/\D/gu, "").slice(0, 6));
					}}
					className="rounded-lg border border-gray-200 px-3 py-2 text-sm tracking-[0.3em] text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
				/>
				{error !== null && (
					<p role="alert" className="text-sm text-red-600 dark:text-red-400">
						{error}
					</p>
				)}
				<div className="flex gap-3">
					<button
						type="submit"
						disabled={code.length !== 6}
						className="tl-button-motion inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("totpPromptSubmit")}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="tl-button-motion inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 dark:border-white/10 dark:text-gray-200"
					>
						{t("totpPromptCancel")}
					</button>
				</div>
			</form>
		</dialog>
	);
}
