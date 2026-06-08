import type { Metadata } from "next";
import { JurorPageInner } from "./_components/JurorPageInner";

export const metadata: Metadata = {
	title: "Juror | TrustLedger",
	description: "Register, manage stake, and review juror eligibility for TrustLedger disputes.",
};

export default function JurorPage(): React.JSX.Element {
	return <JurorPageInner />;
}
