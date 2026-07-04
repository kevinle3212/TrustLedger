import { verifyMagicToken, type MagicLinkPayload } from "@/lib/magicLink";
import { ReviewPageInner } from "./_components/ReviewPageInner";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Review Contract | TrustLedger",
	description: "Review a client-funded freelance contract before accepting or rejecting it.",
};

// The freelancer lands here from the magic-link email sent when a client proposes
// a pre-funded contract. They review the offer and either accept (activating the
// project deadline) or reject (returning funds to the client).

export default async function FreelancerReviewPage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ token?: string }>;
}): Promise<React.JSX.Element> {
	const translationPromise = params.then(
		async ({ locale }) => await getTranslations({ locale, namespace: "Freelancer" }),
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

	return <ReviewPageInner initialPayload={payload} tokenError={tokenError} />;
}
