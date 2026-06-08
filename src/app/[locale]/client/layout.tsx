import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Accept Contract | TrustLedger",
	description: "Review and accept a contract proposal as a client on TrustLedger.",
};

export default function ClientLayout({ children }: { children: React.ReactNode }): React.ReactNode {
	return children;
}
