import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Juror | TrustLedger",
	description: "Review open disputes and cast rulings as a registered juror.",
};

export default function JurorLayout({ children }: { children: React.ReactNode }): React.ReactNode {
	return children;
}
