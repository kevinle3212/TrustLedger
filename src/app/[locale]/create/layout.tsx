import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Create Contract | TrustLedger",
	description: "Draft and deploy a new freelance escrow contract on Ethereum.",
};

export default function CreateLayout({ children }: { children: React.ReactNode }): React.ReactNode {
	return children;
}
