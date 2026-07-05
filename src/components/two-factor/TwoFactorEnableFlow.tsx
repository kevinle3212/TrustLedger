"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import QRCode from "qrcode";

/**
 * The "enable" step of two-factor setup: shows the QR code (and manual
 * secret) from `POST /api/account/2fa/setup`, then verifies a code via
 * `POST /api/account/2fa/verify` to finish enrollment.
 */
export function TwoFactorEnableFlow({
	otpauthUri,
	secret,
	token,
	onVerified,
	onCancel,
}: {
	readonly otpauthUri: string;
	readonly secret: string;
	readonly token: string;
	readonly onVerified: (recoveryCodes: readonly string[]) => void;
	readonly onCancel: () => void;
}): React.JSX.Element {
	const t = useTranslations("Account");
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		QRCode.toDataURL(otpauthUri)
			.then((dataUrl) => {
				if (!cancelled) setQrDataUrl(dataUrl);
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null);
			});
		return (): void => {
			cancelled = true;
		};
	}, [otpauthUri]);

	async function verify(): Promise<void> {
		setError(null);
		const response = await fetch("/api/account/2fa/verify", {
			method: "POST",
			headers: {
				"authorization": `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({ code }),
		});
		const body = (await response.json().catch(() => ({}))) as {
			recoveryCodes?: string[];
			error?: string;
		};
		if (!response.ok || body.recoveryCodes === undefined) {
			setError(body.error ?? t("twoFactorError"));
			return;
		}
		onVerified(body.recoveryCodes);
	}

	return (
		<div className="mt-4 flex flex-col gap-3">
			<p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
				{t("twoFactorSetupInstructions")}
			</p>
			{qrDataUrl !== null && (
				<Image
					src={qrDataUrl}
					alt={t("twoFactorQrAlt")}
					width={200}
					height={200}
					unoptimized
					className="rounded-lg border border-gray-200 dark:border-white/10"
				/>
			)}
			<p className="text-xs text-gray-500 dark:text-gray-400">
				{t("twoFactorSecretLabel")}: <code>{secret}</code>
			</p>
			<label htmlFor="two-factor-verify-code" className="sr-only">
				{t("twoFactorCodeLabel")}
			</label>
			<form
				className="flex flex-col gap-3"
				action={() => {
					void verify();
				}}
			>
				<input
					id="two-factor-verify-code"
					type="text"
					inputMode="numeric"
					autoComplete="one-time-code"
					maxLength={6}
					placeholder={t("twoFactorCodePlaceholder")}
					value={code}
					onChange={(event) => {
						setCode(event.target.value.replace(/\D/gu, "").slice(0, 6));
					}}
					className="max-w-[10rem] rounded-lg border border-gray-200 px-3 py-2 text-sm tracking-[0.3em] text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
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
						className="tl-button-motion inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("twoFactorVerifyButton")}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="tl-button-motion inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 dark:border-white/10 dark:text-gray-200"
					>
						{t("twoFactorCancelButton")}
					</button>
				</div>
			</form>
		</div>
	);
}
