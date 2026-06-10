import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Dashboard | TrustLedger",
};

export default function DashboardLayout({
	children,
}: {
	readonly children: React.ReactNode;
}): React.ReactNode {
	return children;
}
