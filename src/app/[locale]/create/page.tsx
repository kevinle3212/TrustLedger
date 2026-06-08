import type { Metadata } from "next";
import { CreatePageInner } from "./_components/CreatePageInner";

export const metadata: Metadata = {
	title: "Create Contract | TrustLedger",
	description: "Draft and deploy a freelance escrow contract on Ethereum.",
};

export default function CreatePage(): React.JSX.Element {
	return <CreatePageInner />;
}
