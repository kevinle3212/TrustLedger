import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Review Contract | TrustLedger",
	description: "Review a contract proposal as a freelancer before accepting.",
};

export default function FreelancerLayout({
	children,
}: {
	children: React.ReactNode;
}): React.ReactNode {
	return children;
}
