import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { signMagicToken } from "@/lib/magicLink";

const EXPIRY_SECONDS = 72 * 60 * 60; // 72 hours

export async function POST(req: NextRequest): Promise<NextResponse> {
	const secret = process.env["MAGIC_LINK_SECRET"];
	const apiKey = process.env["RESEND_API_KEY"];
	const from = process.env["RESEND_FROM"] ?? "TrustLedger <noreply@trustledger.app>";
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

	const resend = new Resend(apiKey);
	const { error } = await resend.emails.send({
		from,
		to: freelancerEmail,
		subject: `You have a new contract to review - TrustLedger #${contractId}`,
		html: buildEmail(link, contractId),
	});

	if (error !== null) return NextResponse.json({ error: error.message }, { status: 502 });

	return NextResponse.json({ ok: true });
}

function buildEmail(link: string, contractId: string): string {
	return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#0f0f14;color:#e5e7eb;padding:40px 0;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08)">
    <h1 style="margin:0 0 8px;font-size:22px;color:#fff">New Escrow Contract</h1>
    <p style="margin:0 0 24px;color:#9ca3af;font-size:14px">Contract #${contractId} is awaiting your review and acceptance.</p>
    <p style="margin:0 0 32px;color:#d1d5db;font-size:14px">
      Click the button below to review the contract details and connect your wallet to accept.
      This link expires in 72 hours and is single-use.
    </p>
    <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">
      Review &amp; Accept Contract
    </a>
    <p style="margin:32px 0 0;color:#6b7280;font-size:12px">
      If you were not expecting this email, you can ignore it.
      Do not share this link - it is tied to your wallet address.
    </p>
  </div>
</body>
</html>`;
}
