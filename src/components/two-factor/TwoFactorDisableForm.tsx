"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Disables TOTP two-factor after verifying a valid code or unused recovery
 * code via `POST /api/account/2fa/disable`.
 */
export function TwoFactorDisableForm({
	token,
	onDisabled,
}: {
	readonly token: string;
	readonly onDisabled: () => void;
}): React.JSX.Element {
	const t = useTranslations("Account");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function disable(): Promise<void> {
		setError(null);
		const response = await fetch("/api/account/2fa/disable", {
			method: "POST",
			headers: {
				"authorization": `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({ code }),
		});
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		if (!response.ok) {
			setError(body.error ?? t("twoFactorError"));
			return;
		}
		onDisabled();
	}

	return (
		<form
			className="mt-4 flex flex-col gap-3"
			action={() => {
				void disable();
			}}
		>
			<p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
				{t("twoFactorEnabledLabel")}
			</p>
			<label htmlFor="two-factor-disable-code" className="sr-only">
				{t("twoFactorDisableCodeLabel")}
			</label>
			<input
				id="two-factor-disable-code"
				type="text"
				autoComplete="one-time-code"
				placeholder={t("twoFactorDisableCodeLabel")}
				value={code}
				onChange={(event) => {
					setCode(event.target.value.trim());
				}}
				className="max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
			/>
			{error !== null && (
				<p role="alert" className="text-sm text-red-600 dark:text-red-400">
					{error}
				</p>
			)}
			<button
				type="submit"
				disabled={code.length === 0}
				className="tl-button-motion inline-flex min-h-10 w-fit items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400/30 dark:text-red-300"
			>
				{t("twoFactorDisableButton")}
			</button>
		</form>
	);
}
