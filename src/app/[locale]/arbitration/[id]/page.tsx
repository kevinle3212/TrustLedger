import type { Metadata } from "next";
import { ArbitrationDisputePageInner } from "./_components/ArbitrationDisputePageInner";

export const metadata: Metadata = {
	title: "Dispute Arbitration | TrustLedger",
	description: "Review dispute status, commit or reveal votes, and execute arbitration rulings.",
};

export default function ArbitrationDisputePage(): React.JSX.Element {
	return <ArbitrationDisputePageInner />;
}
