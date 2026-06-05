// Central email service. Wraps Resend so every outbound email — magic links and
// contract-lifecycle notifications alike — flows through one place with a shared
// HTML shell, consistent error handling, and a single point to swap providers
// later (see the Phase 6 TODO on evaluating SendGrid/Mailgun/Postmark).
//
// All functions are server-only: they read RESEND_API_KEY at call time and must
// never be imported into a client component (doing so would leak the key into the
// browser bundle). Import these from API routes and other server modules only.

import { Resend } from "resend";

/** Brand accent shared with the rest of the UI (indigo-500). */
const ACCENT = "#6366f1";

/** Result of an email send. Discriminated on `ok` so callers can branch safely. */
export type EmailResult = { ok: true } | { ok: false; error: string };

/** A single outbound email. `html` is the fully-rendered body (see {@link emailShell}). */
export interface OutgoingEmail {
	to: string;
	subject: string;
	html: string;
}

/**
 * Send one email through Resend.
 *
 * Reads configuration from the environment so callers never handle secrets:
 *   - `RESEND_API_KEY` — required; the call fails cleanly if it is unset.
 *   - `RESEND_FROM`    — optional sender override; defaults to the TrustLedger noreply.
 *
 * Never throws: transport and configuration problems are returned as
 * `{ ok: false, error }` so API routes can map them to an HTTP status.
 *
 * @example
 * const res = await sendEmail({ to, subject: "Hi", html: "<p>Hello</p>" });
 * if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
 */
export async function sendEmail(email: OutgoingEmail): Promise<EmailResult> {
	const apiKey = process.env["RESEND_API_KEY"];
	const from = process.env["RESEND_FROM"] ?? "TrustLedger <noreply@trustledger.app>";

	if (apiKey === undefined || apiKey === "") {
		return { ok: false, error: "RESEND_API_KEY not set" };
	}

	try {
		const resend = new Resend(apiKey);
		const { error } = await resend.emails.send({
			from,
			to: email.to,
			subject: email.subject,
			html: email.html,
		});
		if (error !== null) return { ok: false, error: error.message };
		return { ok: true };
	} catch (err) {
		// Network failures and unexpected SDK errors land here rather than crashing the route.
		return { ok: false, error: err instanceof Error ? err.message : "email send failed" };
	}
}

/** An optional call-to-action button rendered at the bottom of an email. */
export interface EmailCta {
	label: string;
	href: string;
}

/**
 * Wrap body content in the shared TrustLedger email layout (dark card, brand
 * accent, optional CTA button, and a muted footer). Centralising the chrome here
 * keeps every notification visually consistent and avoids duplicating the inline
 * styles that email clients require.
 *
 * @param title   Heading shown at the top of the card.
 * @param bodyHtml Inner HTML (already escaped/trusted) describing the event.
 * @param cta     Optional primary button.
 * @param footer  Optional small print under the CTA; defaults to a generic notice.
 */
export function emailShell(
	title: string,
	bodyHtml: string,
	cta?: EmailCta,
	footer?: string,
): string {
	const button =
		cta === undefined
			? ""
			: `<a href="${cta.href}" style="display:inline-block;background:${ACCENT};color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:8px">${cta.label}</a>`;
	const footerText =
		footer ?? "You are receiving this because you are a party to a TrustLedger contract.";
	return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#0f0f14;color:#e5e7eb;padding:40px 0;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08)">
    <h1 style="margin:0 0 16px;font-size:22px;color:#fff">${title}</h1>
    <div style="margin:0 0 24px;color:#d1d5db;font-size:14px;line-height:1.6">${bodyHtml}</div>
    ${button}
    <p style="margin:32px 0 0;color:#6b7280;font-size:12px">${footerText}</p>
  </div>
</body>
</html>`;
}
