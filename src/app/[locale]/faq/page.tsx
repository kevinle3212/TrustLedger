import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { FaqContent } from "@/components/FaqContent";

export const metadata: Metadata = {
	title: "FAQ - TrustLedger",
	description: "Answers to common TrustLedger escrow, wallet, dispute, and faucet questions.",
};

export default async function FaqPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);
	return <FaqContent />;
}
