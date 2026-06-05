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

	let body: { contractId?: unknown; freelancerEmail?: unknown; freelancerAddress?: unknown };
	try {
		body = (await req.json()) as typeof body;
	} catch {
		return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
	}

	const { contractId, freelancerEmail, freelancerAddress } = body;
	if (typeof contractId !== "string" || contractId === "")
		return NextResponse.json({ error: "contractId required" }, { status: 400 });
	if (typeof freelancerEmail !== "string" || !freelancerEmail.includes("@"))
		return NextResponse.json({ error: "valid freelancerEmail required" }, { status: 400 });
	if (typeof freelancerAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(freelancerAddress))
		return NextResponse.json({ error: "valid freelancerAddress required" }, { status: 400 });

	const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
	const exp = Math.floor(Date.now() / 1000) + EXPIRY_SECONDS;

	const token = await signMagicToken(
		{ contractId, freelancerEmail, freelancerAddress, nonce, exp },
		secret,
	);

	const link = `${appUrl}/freelancer/accept?token=${encodeURIComponent(token)}`;

	const result = await sendEmail({
		to: freelancerEmail,
		subject: `You have a new contract to review - TrustLedger #${contractId}`,
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
		"New Escrow Contract",
		`Contract <strong>#${contractId}</strong> is awaiting your review and acceptance.<br /><br />
		 Click the button below to review the contract details and connect your wallet to accept.
		 This link expires in 72 hours and is single-use.`,
		{ label: "Review &amp; Accept Contract", href: link },
		"If you were not expecting this email, you can ignore it. Do not share this link — it is tied to your wallet address.",
	);
}
