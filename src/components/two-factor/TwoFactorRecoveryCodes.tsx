"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { copyToClipboard } from "@/security";

/**
 * One-time display of TOTP recovery codes right after enrollment is verified.
 * The codes are never shown again, so this offers a copy-to-clipboard
 * affordance alongside the save-them-now warning.
 */
export function TwoFactorRecoveryCodes({
	recoveryCodes,
	onDone,
}: {
	readonly recoveryCodes: readonly string[];
	readonly onDone: () => void;
}): React.JSX.Element {
	const t = useTranslations("Account");
	const [copied, setCopied] = useState(false);

	async function copyCodes(): Promise<void> {
		const ok = await copyToClipboard(recoveryCodes.join("\n"));
		if (ok) {
			setCopied(true);
			setTimeout(() => {
				setCopied(false);
			}, 1500);
		}
	}

	return (
		<div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
			<p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
				{t("twoFactorRecoveryTitle")}
			</p>
			<p className="text-sm leading-6 text-amber-950 dark:text-amber-50">
				{t("twoFactorRecoveryWarning")}
			</p>
			<ul className="grid gap-1 rounded-lg bg-white/60 p-3 font-mono text-sm dark:bg-black/20">
				{recoveryCodes.map((recoveryCode) => (
					<li key={recoveryCode}>{recoveryCode}</li>
				))}
			</ul>
			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => {
						void copyCodes();
					}}
					className="tl-button-motion inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 hover:border-amber-400 dark:border-amber-400/30 dark:text-amber-100"
				>
					{copied ? t("twoFactorRecoveryCopied") : t("twoFactorRecoveryCopyButton")}
				</button>
				<button
					type="button"
					onClick={onDone}
					className="tl-button-motion inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
				>
					{t("twoFactorRecoveryDoneButton")}
				</button>
			</div>
		</div>
	);
}
