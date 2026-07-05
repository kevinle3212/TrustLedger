"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useAccountSession } from "@/lib/accountSession";
import { TotpStepUpPrompt } from "@/components/TotpStepUpPrompt";
import { TwoFactorDisableForm } from "@/components/two-factor/TwoFactorDisableForm";
import { TwoFactorEnableFlow } from "@/components/two-factor/TwoFactorEnableFlow";
import { TwoFactorRecoveryCodes } from "@/components/two-factor/TwoFactorRecoveryCodes";

type ViewState =
	| { readonly step: "loading" }
	| { readonly step: "disabled" }
	| { readonly step: "enabling"; readonly otpauthUri: string; readonly secret: string }
	| { readonly step: "recovery"; readonly recoveryCodes: readonly string[] }
	| { readonly step: "enabled" };

/** `GET /api/account/2fa` — reports whether the wallet has TOTP enabled. */
async function fetchTwoFactorEnabled(token: string): Promise<boolean> {
	const response = await fetch("/api/account/2fa", {
		headers: { authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Could not load two-factor status.");
	const body = (await response.json()) as { enabled: boolean };
	return body.enabled;
}

/** `POST /api/account/2fa/setup` — begins enrollment, returning the QR/secret. */
async function beginTwoFactorSetup(token: string): Promise<{ otpauthUri: string; secret: string }> {
	const response = await fetch("/api/account/2fa/setup", {
		method: "POST",
		headers: { authorization: `Bearer ${token}` },
	});
	if (!response.ok) throw new Error("Could not start two-factor setup.");
	return (await response.json()) as { otpauthUri: string; secret: string };
}

/**
 * Account-page card for opt-in TOTP two-factor authentication: enable (QR +
 * manual secret + verification code, then one-time recovery codes) and disable
 * (a valid code or recovery code). Mirrors {@link InactivityTimeoutSetting}'s
 * structure and styling; delegates each step to a focused subcomponent.
 */
export function TwoFactorSetting(): React.JSX.Element {
	const t = useTranslations("Account");
	const session = useAccountSession();
	const [view, setView] = useState<ViewState>({ step: "loading" });
	const [error, setError] = useState<string | null>(null);

	// Runs once on mount to load the initial two-factor status. session.ensureSession
	// is intentionally excluded from the dependency array so re-renders don't
	// re-trigger the sign-in flow.
	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(() => {
		const cancelledRef = { current: false };
		const isCancelled = (): boolean => cancelledRef.current;
		const loadStatus = async (): Promise<void> => {
			const token = await session.ensureSession();
			if (token === null || isCancelled()) return;
			try {
				const enabled = await fetchTwoFactorEnabled(token);
				if (!isCancelled()) setView(enabled ? { step: "enabled" } : { step: "disabled" });
			} catch {
				if (!isCancelled()) setView({ step: "disabled" });
			}
		};
		void loadStatus();
		return (): void => {
			cancelledRef.current = true;
		};
		// react-doctor-disable-next-line react-doctor/exhaustive-deps -- see comment above; runs once on mount.
	}, []);
	/* eslint-enable react-hooks/exhaustive-deps */

	async function startEnable(): Promise<void> {
		setError(null);
		const token = await session.ensureSession();
		if (token === null) return;
		try {
			const setup = await beginTwoFactorSetup(token);
			setView({ step: "enabling", otpauthUri: setup.otpauthUri, secret: setup.secret });
		} catch {
			setError(t("twoFactorError"));
		}
	}

	return (
		<article className="tl-motion-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
			<h2 className="text-lg font-semibold text-gray-950 dark:text-white">
				{t("twoFactorTitle")}
			</h2>
			<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
				{t("twoFactorBody")}
			</p>

			{session.status === "totp-required" && (
				<div className="mt-4">
					<TotpStepUpPrompt
						error={session.error}
						onCancel={session.cancelTotp}
						onSubmit={(code) => {
							void session.promptTotp(code);
						}}
					/>
				</div>
			)}

			{view.step === "loading" && (
				<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
					{t("twoFactorLoadingStatus")}
				</p>
			)}

			{view.step === "disabled" && (
				<div className="mt-4">
					<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
						{t("twoFactorDisabledLabel")}
					</p>
					{error !== null && (
						<p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
							{error}
						</p>
					)}
					<button
						type="button"
						onClick={() => {
							void startEnable();
						}}
						className="tl-button-motion mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
					>
						{t("twoFactorEnableButton")}
					</button>
				</div>
			)}

			{view.step === "enabling" && session.token !== null && (
				<TwoFactorEnableFlow
					otpauthUri={view.otpauthUri}
					secret={view.secret}
					token={session.token}
					onVerified={(recoveryCodes) => {
						setView({ step: "recovery", recoveryCodes });
					}}
					onCancel={() => {
						setView({ step: "disabled" });
					}}
				/>
			)}

			{view.step === "recovery" && (
				<TwoFactorRecoveryCodes
					recoveryCodes={view.recoveryCodes}
					onDone={() => {
						setView({ step: "enabled" });
					}}
				/>
			)}

			{view.step === "enabled" && session.token !== null && (
				<TwoFactorDisableForm
					token={session.token}
					onDisabled={() => {
						setView({ step: "disabled" });
					}}
				/>
			)}
		</article>
	);
}
