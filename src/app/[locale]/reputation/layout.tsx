import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Reputation | TrustLedger",
	description: "Look up on-chain reputation scores for any Ethereum address.",
};

export default function ReputationLayout({
	children,
}: {
	children: React.ReactNode;
}): React.ReactNode {
	return children;
}
