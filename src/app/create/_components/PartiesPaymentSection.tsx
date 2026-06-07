"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import type { FormFields } from "../_lib/types";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
	isClientProposing: boolean;
	isUsdc: boolean;
}

/** Parties & Payment card — counterparty address, email, and escrow amount. */
export function PartiesPaymentSection({
	form,
	set,
	showError,
	markTouched,
	isClientProposing,
	isUsdc,
}: Props): React.JSX.Element {
	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<h2 className="font-semibold text-gray-900 dark:text-white">Parties &amp; Payment</h2>

			<Field
				label={isClientProposing ? "Freelancer Address" : "Client Address"}
				hint={
					isClientProposing
						? "The wallet that will review, accept, and deliver the work."
						: "The wallet that will review, fund, and approve this contract."
				}
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
				label={isClientProposing ? "Freelancer Email" : "Client Email"}
				hint={
					isClientProposing
						? "A signed magic link will be sent here so the freelancer can review and accept via the web."
						: "A signed magic link will be sent here so the client can review and accept via the web."
				}
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
				label={`Escrow Amount (${isUsdc ? "USDC" : "ETH"})`}
				hint={
					isClientProposing
						? `Total ${isUsdc ? "USDC" : "ETH"} you agree to lock in escrow once the freelancer accepts.${isUsdc ? " You will approve the USDC transfer when funding." : ""}`
						: `Total ${isUsdc ? "USDC" : "ETH"} the client will lock in escrow on acceptance.${isUsdc ? " The client must approve the USDC transfer before funding." : ""}`
				}
				error={showError("amount")}
			>
				<Input
					type="number"
					placeholder={isUsdc ? "100" : "0.5"}
					min={isUsdc ? "0.01" : "0.000001"}
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
