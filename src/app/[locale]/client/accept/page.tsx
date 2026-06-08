import { verifyMagicToken, type MagicLinkPayload } from "@/lib/magicLink";
import { AcceptPageInner } from "./_components/AcceptPageInner";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Accept Contract | TrustLedger",
	description: "Review and fund a freelance escrow contract from a secure magic link.",
};

// The client lands here from the magic-link email. They review the freelancer's
// proposal, securely view the (optionally encrypted) IPFS contract document, then
// either accept — funding the escrow in the same transaction — or reject it.

export default async function AcceptPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>;
}): Promise<React.JSX.Element> {
	const { token } = await searchParams;

	let payload: MagicLinkPayload | null = null;
	let tokenError: string | null = null;

	if (token === undefined || token === "") {
		tokenError = "No token provided.";
	} else {
		const secret = process.env["MAGIC_LINK_SECRET"];
		if (secret === undefined || secret === "") {
			tokenError = "Server configuration error.";
		} else {
			try {
				payload = await verifyMagicToken(token, secret);
			} catch (err) {
				tokenError = err instanceof Error ? err.message : "Invalid link.";
			}
		}
	}

	return <AcceptPageInner initialPayload={payload} tokenError={tokenError} />;
}
