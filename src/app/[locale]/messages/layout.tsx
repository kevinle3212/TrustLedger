import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Messages | TrustLedger",
	description: "End-to-end encrypted in-app messaging between wallet addresses.",
};

export default function MessagesLayout({
	children,
}: {
	children: React.ReactNode;
}): React.ReactNode {
	return children;
}
