import type { Metadata } from "next";
import { AnalyticsPageInner } from "./_components/AnalyticsPageInner";

export const metadata: Metadata = {
	title: "Wallet Analytics | TrustLedger",
	description:
		"View privacy-safe wallet analytics, public contract metrics, and TrustLedger usage insights.",
};

export default function AnalyticsPage(): React.JSX.Element {
	return <AnalyticsPageInner />;
}
