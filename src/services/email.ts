// Central email service. Every outbound email - magic links and contract
// lifecycle notifications alike - flows through this provider abstraction with
// a shared HTML shell and one server-only integration boundary.

import { Resend } from "resend";
import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

/** Brand accent shared with the rest of the UI (indigo-500). */
const ACCENT = "#6366f1";

const DEFAULT_FROM = "TrustLedger <noreply@trustledger.app>";
const MAX_RECIPIENTS = 5;
const MAX_EMAIL_LENGTH = 254;
const MAX_EMAIL_LOCAL_LENGTH = 64;

type EmailProvider = "resend" | "brevo" | "postmark" | "log";

/** Result of an email send. Discriminated on `ok` so callers can branch safely. */
export type EmailResult =
	| { ok: true; provider: EmailProvider; sent: number }
	| { ok: false; error: string; provider: EmailProvider };

/** A single outbound email. `html` is the fully rendered body. */
export interface OutgoingEmail {
	to: string | readonly string[];
	subject: string;
	html: string;
}

interface ProviderConfig {
	readonly provider: EmailProvider;
	readonly from: string;
}

function parseProvider(raw: string | undefined): EmailProvider {
	const value = raw?.trim().toLowerCase();
	if (value === "brevo" || value === "postmark" || value === "log") return value;
	return "resend";
}

function providerConfig(): ProviderConfig {
	return {
		provider: parseProvider(process.env["EMAIL_PROVIDER"]),
		from:
			process.env["EMAIL_FROM"] ??
			process.env["RESEND_FROM"] ??
			process.env["POSTMARK_FROM"] ??
			process.env["BREVO_FROM"] ??
			DEFAULT_FROM,
	};
}

function normalizeRecipients(to: string | readonly string[]): string[] {
	const raw: readonly string[] = typeof to === "string" ? to.split(/[;,]/u) : to;
	const seen = new Set<string>();
	const recipients: string[] = [];
	for (const candidate of raw) {
		const trimmed = candidate.trim();
		if (!isValidRecipientEmail(trimmed)) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		recipients.push(trimmed);
	}
	return recipients.slice(0, MAX_RECIPIENTS);
}

function hasOnlyEmailLocalCharacters(value: string): boolean {
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		const isAlphaNumeric =
			(code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
		if (isAlphaNumeric || ".!#$%&'*+/=?^_`{|}~-".includes(char)) continue;
		return false;
	}
	return true;
}

function isValidDomainLabel(value: string): boolean {
	if (value === "" || value.startsWith("-") || value.endsWith("-")) return false;
	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;
		const isAlphaNumeric =
			(code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
		if (isAlphaNumeric || char === "-") continue;
		return false;
	}
	return true;
}

function isValidRecipientEmail(value: string): boolean {
	if (value === "" || value.length > MAX_EMAIL_LENGTH || value.includes(" ")) return false;
	const atIndex = value.indexOf("@");
	if (atIndex <= 0 || atIndex !== value.lastIndexOf("@")) return false;
	const local = value.slice(0, atIndex);
	const domain = value.slice(atIndex + 1).toLowerCase();
	if (
		local.length > MAX_EMAIL_LOCAL_LENGTH ||
		domain.length === 0 ||
		!domain.includes(".") ||
		!hasOnlyEmailLocalCharacters(local)
	) {
		return false;
	}
	return domain.split(".").every(isValidDomainLabel);
}

function missing(name: string, provider: EmailProvider): EmailResult {
	return { ok: false, provider, error: `${name} not set` };
}

async function sendResend(
	email: OutgoingEmail,
	recipients: readonly string[],
	from: string,
): Promise<EmailResult> {
	const apiKey = process.env["RESEND_API_KEY"];
	if (apiKey === undefined || apiKey === "") return missing("RESEND_API_KEY", "resend");

	try {
		const resend = new Resend(apiKey);
		const results = await Promise.all(
			recipients.map(async (recipient) => {
				await Promise.resolve();
				return await resend.emails.send({
					from,
					to: recipient,
					subject: email.subject,
					html: email.html,
				});
			}),
		);
		const failed = results.find(({ error }) => error !== null);
		if (failed?.error !== null && failed?.error !== undefined) {
			return { ok: false, provider: "resend", error: failed.error.message };
		}
		return { ok: true, provider: "resend", sent: recipients.length };
	} catch (err) {
		return { ok: false, provider: "resend", error: emailError(err) };
	}
}

async function postJson(
	url: string,
	headers: Readonly<Record<string, string>>,
	body: object,
): Promise<string | null> {
	const response = await fetchWithTimeout(
		url,
		{
			method: "POST",
			headers: { "content-type": "application/json", ...headers },
			body: JSON.stringify(body),
		},
		REQUEST_TIMEOUT_MS.emailProvider,
	);
	if (response.ok) return null;
	const text = await response.text();
	return text === "" ? response.statusText : text;
}

async function sendBrevo(
	email: OutgoingEmail,
	recipients: readonly string[],
	from: string,
): Promise<EmailResult> {
	const apiKey = process.env["BREVO_API_KEY"];
	if (apiKey === undefined || apiKey === "") return missing("BREVO_API_KEY", "brevo");
	const senderEmail = /<([^>]+)>/u.exec(from)?.[1] ?? from;
	const senderName = from.includes("<") ? from.split("<")[0]?.trim() : "TrustLedger";

	try {
		const errors = await Promise.all(
			recipients.map(async (recipient) => {
				await Promise.resolve();
				return await postJson(
					"https://api.brevo.com/v3/smtp/email",
					{ "api-key": apiKey },
					{
						sender: { name: senderName, email: senderEmail },
						to: [{ email: recipient }],
						subject: email.subject,
						htmlContent: email.html,
					},
				);
			}),
		);
		const error = errors.find((result): result is string => result !== null);
		if (error !== undefined) return { ok: false, provider: "brevo", error };
		return { ok: true, provider: "brevo", sent: recipients.length };
	} catch (err) {
		return { ok: false, provider: "brevo", error: emailError(err) };
	}
}

async function sendPostmark(
	email: OutgoingEmail,
	recipients: readonly string[],
	from: string,
): Promise<EmailResult> {
	const token = process.env["POSTMARK_SERVER_TOKEN"];
	if (token === undefined || token === "") return missing("POSTMARK_SERVER_TOKEN", "postmark");

	try {
		const errors = await Promise.all(
			recipients.map(async (recipient) => {
				await Promise.resolve();
				return await postJson(
					"https://api.postmarkapp.com/email",
					{
						"X-Postmark-Server-Token": token,
						"Accept": "application/json",
					},
					{
						From: from,
						To: recipient,
						Subject: email.subject,
						HtmlBody: email.html,
						MessageStream: process.env["POSTMARK_MESSAGE_STREAM"] ?? "outbound",
					},
				);
			}),
		);
		const error = errors.find((result): result is string => result !== null);
		if (error !== undefined) return { ok: false, provider: "postmark", error };
		return { ok: true, provider: "postmark", sent: recipients.length };
	} catch (err) {
		return { ok: false, provider: "postmark", error: emailError(err) };
	}
}

function emailError(err: unknown): string {
	return err instanceof Error ? err.message : "email send failed";
}

/**
 * Send one email through the configured provider.
 *
 * Environment:
 * - `EMAIL_PROVIDER`: `resend`, `brevo`, `postmark`, or `log`.
 * - `EMAIL_FROM`: provider-agnostic sender override.
 * - Provider credentials stay server-side only.
 */
export async function sendEmail(email: OutgoingEmail): Promise<EmailResult> {
	const recipients = normalizeRecipients(email.to);
	const config = providerConfig();
	if (recipients.length === 0) {
		return { ok: false, provider: config.provider, error: "valid recipient email required" };
	}

	if (config.provider === "log") {
		return { ok: true, provider: "log", sent: recipients.length };
	}
	if (config.provider === "brevo") return await sendBrevo(email, recipients, config.from);
	if (config.provider === "postmark") return await sendPostmark(email, recipients, config.from);
	return await sendResend(email, recipients, config.from);
}

/** An optional call-to-action button rendered at the bottom of an email. */
export interface EmailCta {
	label: string;
	href: string;
}

/** Escapes `&`, `<`, `>`, `"`, and `'` for safe HTML email interpolation. */
export function escapeEmailHtml(value: string): string {
	return value
		.replace(/&/gu, "&amp;")
		.replace(/</gu, "&lt;")
		.replace(/>/gu, "&gt;")
		.replace(/"/gu, "&quot;")
		.replace(/'/gu, "&#39;");
}

function safeEmailHref(value: string): string {
	try {
		const url = new URL(value);
		if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
	} catch {
		return "#";
	}
	return "#";
}

/**
 * Wraps `bodyHtml` in the TrustLedger branded email shell.
 *
 * @param title - Email heading text.
 * @param bodyHtml - Pre-escaped inner HTML body content.
 * @param cta - Optional call-to-action button.
 * @param footer - Optional footer override; defaults to the standard TrustLedger disclaimer.
 * @returns A complete HTML email string ready to send.
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
			: `<a href="${escapeEmailHtml(safeEmailHref(cta.href))}" style="display:inline-block;background:${ACCENT};color:#fff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;margin-top:8px">${escapeEmailHtml(cta.label)}</a>`;
	const footerText =
		footer ?? "You are receiving this because you are a party to a TrustLedger contract.";
	const safeTitle = escapeEmailHtml(title);
	const safeFooterText = escapeEmailHtml(footerText);
	return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#0f0f14;color:#e5e7eb;padding:40px 0;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08)">
    <h1 style="margin:0 0 16px;font-size:22px;color:#fff">${safeTitle}</h1>
    <div style="margin:0 0 24px;color:#d1d5db;font-size:14px;line-height:1.6">${bodyHtml}</div>
    ${button}
    <p style="margin:32px 0 0;color:#6b7280;font-size:12px">${safeFooterText}</p>
  </div>
</body>
</html>`;
}
