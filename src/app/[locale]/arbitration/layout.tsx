import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Arbitration | TrustLedger",
	description: "View and manage an ongoing arbitration dispute.",
};

export default function ArbitrationLayout({
	children,
}: {
	children: React.ReactNode;
}): React.ReactNode {
	return children;
}
