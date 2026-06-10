"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { useTranslations } from "next-intl";
import { getPaymentTokenLabel } from "../_lib/paymentToken";
import type { FormFields, PaymentToken } from "../_lib/types";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
	isClientProposing: boolean;
	paymentToken: PaymentToken;
}

/** Parties & Payment card — counterparty address, email, and escrow amount. */
export function PartiesPaymentSection({
	form,
	set,
	showError,
	markTouched,
	isClientProposing,
	paymentToken,
}: Props): React.JSX.Element {
	const t = useTranslations("Create");
	const isUsdc = paymentToken === "usdc";
	const isSol = paymentToken === "sol";
	const token = getPaymentTokenLabel(paymentToken);

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white">
				{t("partiesPaymentTitle")}
			</h2>

			<Field
				label={isClientProposing ? t("freelancerAddress") : t("clientAddress")}
				hint={isClientProposing ? t("freelancerAddressHint") : t("clientAddressHint")}
				error={showError("client")}
			>
				<Input
					type="text"
					placeholder="0x..."
					value={form.client}
					onChange={(e) => {
						set("client", e.target.value);
					}}
					onBlur={() => {
						markTouched("client");
					}}
					error={showError("client") !== undefined}
					required
					pattern="^0x[0-9a-fA-F]{40}$"
				/>
			</Field>

			<Field
				label={isClientProposing ? t("freelancerEmail") : t("clientEmail")}
				hint={isClientProposing ? t("freelancerEmailHint") : t("clientEmailHint")}
				error={showError("clientEmail")}
			>
				<Input
					type="email"
					placeholder="client@example.com"
					value={form.clientEmail}
					onChange={(e) => {
						set("clientEmail", e.target.value);
					}}
					onBlur={() => {
						markTouched("clientEmail");
					}}
					error={showError("clientEmail") !== undefined}
				/>
			</Field>

			<Field
				label={t("escrowAmountLabel", { token })}
				hint={
					isSol
						? t("escrowHintSol")
						: isClientProposing
							? isUsdc
								? t("escrowHintClientUsdc")
								: t("escrowHintClientEth")
							: isUsdc
								? t("escrowHintFreelancerUsdc")
								: t("escrowHintFreelancerEth")
				}
				error={showError("amount")}
			>
				<Input
					type="number"
					placeholder={isUsdc ? "100" : isSol ? "0.5" : "0.5"}
					min={isUsdc ? "0.01" : isSol ? "0.000000001" : "0.000001"}
					step="any"
					value={form.amount}
					onChange={(e) => {
						set("amount", e.target.value);
					}}
					onBlur={() => {
						markTouched("amount");
					}}
					error={showError("amount") !== undefined}
					required
				/>
			</Field>
			{showError("paymentToken") !== undefined && (
				<p className="text-xs text-red-500 dark:text-red-400">
					{showError("paymentToken")}
				</p>
			)}
		</div>
	);
}
