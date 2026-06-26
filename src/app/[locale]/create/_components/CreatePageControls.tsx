"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { useTranslations } from "next-intl";
import { getPaymentTokenLabel, PAYMENT_TOKENS } from "../_lib/paymentToken";
import type { useCreatePageState } from "../_lib/useCreatePageState";

type CreatePageState = ReturnType<typeof useCreatePageState>;

export function CreatePageHeader({
	isClientProposing,
	paymentToken,
}: {
	readonly isClientProposing: boolean;
	readonly paymentToken: CreatePageState["state"]["paymentToken"];
}): React.JSX.Element {
	const t = useTranslations("Create");
	const tokenLabel = getPaymentTokenLabel(paymentToken);
	return (
		<div className="mb-8">
			<h1 className="tl-page-title">
				{isClientProposing ? t("titleClient") : t("titleFreelancer")}
			</h1>
			<p className="tl-page-description text-gray-500 dark:text-gray-400">
				{isClientProposing
					? t("subtitleClient")
					: t("subtitleFreelancer", { token: tokenLabel })}
			</p>
		</div>
	);
}

export function CreatePageControls({
	page,
}: {
	readonly page: CreatePageState;
}): React.JSX.Element {
	const t = useTranslations("Create");
	const tNav = useTranslations("Nav");
	const { state, dispatch, isConnected, isUsdc, usdcAddress, setProposerRole } = page;
	const { proposerRole, paymentToken } = state;

	return (
		<>
			<div className="mb-6 flex flex-wrap items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">{t("iAmThe")}</span>
				<div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
					{(["freelancer", "client"] as const).map((role) => (
						<button
							key={role}
							type="button"
							onClick={() => {
								setProposerRole(role);
							}}
							className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
								proposerRole === role
									? "bg-indigo-600 text-white"
									: "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							}`}
						>
							{role === "client" ? tNav("roleClient") : tNav("roleFreelancer")}
						</button>
					))}
				</div>
				<span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
					{t("bewareWarning")}
				</span>
			</div>

			<div className="mb-6 flex flex-wrap items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">
					{t("paymentCurrency")}
				</span>
				<div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
					{PAYMENT_TOKENS.map((token) => (
						<button
							key={token}
							type="button"
							onClick={() => {
								dispatch({ type: "SET_PAYMENT_TOKEN", token });
							}}
							className={`rounded-md px-4 py-1.5 text-sm font-medium uppercase transition-colors ${
								paymentToken === token
									? "bg-indigo-600 text-white"
									: "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							}`}
						>
							{token}
						</button>
					))}
				</div>
				{isUsdc && usdcAddress === undefined && (
					<span className="text-xs text-red-500 dark:text-red-400">
						{t("usdcNotSupported")}
					</span>
				)}
				{paymentToken === "sol" && (
					<span className="hidden max-w-md rounded-lg border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 md:inline">
						{t("solDraftNote")}
					</span>
				)}
			</div>

			{!isConnected && paymentToken !== "sol" && (
				<div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
					<span>{t("connectWallet")}</span>
					<ConnectButton />
				</div>
			)}
		</>
	);
}
