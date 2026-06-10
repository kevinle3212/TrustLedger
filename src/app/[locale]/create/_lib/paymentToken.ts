import type { PaymentToken } from "./types";

export const PAYMENT_TOKENS = ["eth", "usdc", "sol"] as const satisfies readonly PaymentToken[];

export function getPaymentTokenLabel(token: PaymentToken): "ETH" | "USDC" | "SOL" {
	if (token === "usdc") return "USDC";
	if (token === "sol") return "SOL";
	return "ETH";
}

export function getPaymentTokenMaximumFractionDigits(token: PaymentToken): number {
	if (token === "usdc") return 2;
	if (token === "sol") return 9;
	return 6;
}
