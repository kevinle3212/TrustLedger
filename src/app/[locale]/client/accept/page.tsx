import { verifyMagicToken, type MagicLinkPayload } from "@/lib/magicLink";
import { AcceptPageInner } from "./_components/AcceptPageInner";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Accept Contract | TrustLedger",
	description: "Review and fund a freelance escrow contract from a secure magic link.",
};

// The client lands here from the magic-link email. They review the freelancer's
// proposal, securely view the (optionally encrypted) IPFS contract document, then
// either accept — funding the escrow in the same transaction — or reject it.

export default async function AcceptPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ token?: string }>;
}): Promise<React.JSX.Element> {
	const translationPromise = params.then(
		async ({ locale }) => await getTranslations({ locale, namespace: "Client" }),
	);
	const [{ token }, t] = await Promise.all([searchParams, translationPromise]);

	let payload: MagicLinkPayload | null = null;
	let tokenError: string | null = null;

	if (token === undefined || token === "") {
		tokenError = t("tokenMissing");
	} else {
		const secret = process.env.MAGIC_LINK_SECRET;
		if (secret === undefined || secret === "") {
			tokenError = t("serverConfigError");
		} else {
			try {
				payload = await verifyMagicToken(token, secret);
			} catch (err) {
				tokenError =
					err instanceof Error && err.message === "token expired"
						? t("tokenExpired")
						: t("tokenInvalid");
			}
		}
	}

	return <AcceptPageInner initialPayload={payload} tokenError={tokenError} />;
}
