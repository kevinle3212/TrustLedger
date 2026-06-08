import type { Metadata } from "next";
import { ReputationPageInner } from "./_components/ReputationPageInner";

export const metadata: Metadata = {
	title: "Reputation | TrustLedger",
	description: "Look up on-chain reputation scores and rating history for an Ethereum address.",
};

export default function ReputationPage(): React.JSX.Element {
	return <ReputationPageInner />;
}
