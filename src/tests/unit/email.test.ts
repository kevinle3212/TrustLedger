import { emailShell, sendEmail } from "@/services/email";
import { buildNotification } from "@/services/notifications";

describe("email service", () => {
	const originalEnv = process.env;
	const originalFetch = global.fetch;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it("supports a local log provider for multi-recipient development testing", async () => {
		process.env.EMAIL_PROVIDER = "log";

		const result = await sendEmail({
			to: "one@example.com, two@example.com;one@example.com",
			subject: "Magic Link",
			html: "<p>Hello</p>",
		});

		expect(result).toEqual({ ok: true, provider: "log", sent: 2 });
	});

	it("uses Brevo when configured without exposing the API key to callers", async () => {
		process.env.EMAIL_PROVIDER = "brevo";
		process.env.BREVO_API_KEY = "brevo-test-key";
		global.fetch = jest.fn(async () => {
			await Promise.resolve();
			return {
				ok: true,
				statusText: "Accepted",
				text: async () => {
					await Promise.resolve();
					return "{}";
				},
			} as Response;
		});

		const result = await sendEmail({
			to: ["one@example.com", "two@example.com"],
			subject: "Contract Update",
			html: "<p>Updated</p>",
		});

		expect(result).toEqual({ ok: true, provider: "brevo", sent: 2 });
		expect(global.fetch).toHaveBeenCalledTimes(2);
		const calls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
		const firstBody = calls[0]?.[1]?.body;
		expect(firstBody).not.toContain("brevo-test-key");
	});

	it("fails cleanly when the selected provider is not configured", async () => {
		process.env.EMAIL_PROVIDER = "postmark";
		delete process.env.POSTMARK_SERVER_TOKEN;

		const result = await sendEmail({
			to: "ops@example.com",
			subject: "Missing Provider",
			html: "<p>Body</p>",
		});

		expect(result).toEqual({
			ok: false,
			provider: "postmark",
			error: "POSTMARK_SERVER_TOKEN not set",
		});
	});

	it("escapes email shell text and rejects unsafe CTA links", () => {
		const html = emailShell(
			"<img src=x onerror=alert(1)>",
			"<strong>Intentional Markup</strong>",
			{ label: "<Click>", href: 'javascript:alert("x")' },
			"Footer <script>alert(1)</script>",
		);

		expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
		expect(html).toContain("<strong>Intentional Markup</strong>");
		expect(html).toContain('href="#"');
		expect(html).toContain("&lt;Click&gt;");
		expect(html).toContain("Footer &lt;script&gt;alert(1)&lt;/script&gt;");
	});

	it("escapes dynamic notification fields before rendering HTML", () => {
		const html = buildNotification("dispute_resolved", {
			appUrl: "https://trustledger.example",
			contractId: '7"><img src=x onerror=alert(1)>',
			detail: "<script>alert(1)</script>",
		}).html;

		expect(html).toContain("#7&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(html).not.toContain("<script>alert(1)</script>");
		expect(html).not.toContain("<img src=x onerror=alert(1)>");
	});
});
