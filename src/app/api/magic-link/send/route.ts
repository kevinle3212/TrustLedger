import { type NextRequest, NextResponse } from "next/server";
import { signMagicToken } from "@/lib/magicLink";
import { emailShell, sendEmail } from "@/services/email";

const EXPIRY_SECONDS = 72 * 60 * 60; // 72 hours

export async function POST(req: NextRequest): Promise<NextResponse> {
	const secret = process.env["MAGIC_LINK_SECRET"];
	const apiKey = process.env["RESEND_API_KEY"];
	const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";

	if (secret === undefined || secret === "")
		return NextResponse.json({ error: "MAGIC_LINK_SECRET not set" }, { status: 500 });
	if (apiKey === undefined || apiKey === "")
		return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

	let body: {
		contractId?: unknown;
		clientEmail?: unknown;
		clientAddress?: unknown;
		// Optional: set when the client proposes and needs to notify the freelancer.
		role?: unknown;
	};
	try {
		body = (await req.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
	}

	const { contractId, clientEmail, clientAddress, role } = body;
	if (typeof contractId !== "string" || contractId === "")
		return NextResponse.json({ error: "contractId required" }, { status: 400 });
	if (typeof clientEmail !== "string" || !clientEmail.includes("@"))
		return NextResponse.json({ error: "valid clientEmail required" }, { status: 400 });
	if (typeof clientAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(clientAddress))
		return NextResponse.json({ error: "valid clientAddress required" }, { status: 400 });

	// role defaults to "client" (freelancer-proposed flow). Pass "freelancer" when the
	// client proposes and needs to notify the freelancer to review.
	const resolvedRole: "client" | "freelancer" = role === "freelancer" ? "freelancer" : "client";

	const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
	const exp = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;

	const token = await signMagicToken(
		{ contractId, clientEmail, clientAddress, role: resolvedRole, nonce, exp },
		secret,
	);

	// Route the recipient to the appropriate review page based on their role.
	const reviewPath = resolvedRole === "freelancer" ? "/freelancer/review" : "/client/accept";
	const link = `${appUrl}${reviewPath}?token=${encodeURIComponent(token)}`;

	const isFreelancerRecipient = resolvedRole === "freelancer";
	const result = await sendEmail({
		to: clientEmail,
		subject: isFreelancerRecipient
			? `You have a new contract offer to review - TrustLedger #${contractId}`
			: `You have a new contract to review - TrustLedger #${contractId}`,
		html: buildEmail(link, contractId),
	});

	if (!result.ok) {
		return NextResponse.json({ error: result.error }, { status: 502 });
	}

	return NextResponse.json({ ok: true });
}

// Magic-link email body, rendered with the shared TrustLedger email shell. The
// single-use, wallet-bound caveat is the only copy specific to this flow.
function buildEmail(link: string, contractId: string): string {
	return emailShell(
		"New Escrow Contract Proposal",
		`A freelancer has proposed contract <strong>#${contractId}</strong> and it is awaiting your review.<br /><br />
		 Click the button below to review the terms, securely view the contract document, and connect
		 your wallet to accept (locking the escrow) or reject. This link expires in 72 hours.`,
		{ label: "Review Proposal", href: link },
		"If you were not expecting this email, you can ignore it. Do not share this link — it is tied to your wallet address.",
	);
}
