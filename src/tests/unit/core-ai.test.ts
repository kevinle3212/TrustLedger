import {
	AiConfigError,
	generateText,
	isAiEnabled,
	resetAiConfigCache,
	resetProviderCache,
} from "@/core/ai";

jest.mock("server-only", () => ({}), { virtual: true });

function clearAiEnv(): void {
	delete process.env.AI_ENABLED;
	delete process.env.AI_PROVIDER_KIND;
	delete process.env.AI_BASE_URL;
	delete process.env.AI_API_KEY;
	delete process.env.AI_DEFAULT_MODEL;
	delete process.env.AI_DEFAULT_PROVIDER;
	delete process.env.AI_PROVIDERS_JSON;
	delete process.env.AI_ROUTES_JSON;
	delete process.env.OPENROUTER_API_KEY;
	delete process.env.OPENROUTER_BASE_URL;
	delete process.env.AI_FALLBACK_MODEL;
	/* eslint-disable @typescript-eslint/no-deprecated -- clearing the deprecated legacy vars is required to isolate the backward-compat test */
	delete process.env.GEMINI_API_KEY;
	delete process.env.GEMINI_MODEL;
	delete process.env.OPENAI_API_KEY;
	delete process.env.OPENAI_BASE_URL;
	delete process.env.OPENAI_MODEL;
	/* eslint-enable @typescript-eslint/no-deprecated */
}

function jsonResponse(payload: unknown): Response {
	return {
		ok: true,
		status: 200,
		json: async () => {
			await Promise.resolve();
			return payload;
		},
	} as Response;
}

describe("@/core/ai", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		clearAiEnv();
		resetAiConfigCache();
		resetProviderCache();
	});

	afterEach(() => {
		process.env = originalEnv;
		resetAiConfigCache();
		resetProviderCache();
		jest.restoreAllMocks();
	});

	it("runs the disabled placeholder with no configuration", async () => {
		expect(isAiEnabled()).toBe(false);
		const result = await generateText({ messages: [{ role: "user", content: "hi" }] });
		expect(result.placeholder).toBe(true);
		expect(result.provider).toBe("disabled");
	});

	it("routes an OpenAI-compatible provider through the chat-completions API", async () => {
		process.env.AI_PROVIDER_KIND = "openai-compatible";
		process.env.AI_BASE_URL = "https://api.groq.com/openai/v1";
		process.env.AI_API_KEY = "test-key";
		process.env.AI_DEFAULT_MODEL = "llama-3.3-70b-versatile";
		resetAiConfigCache();
		resetProviderCache();

		const fetchMock = jest.fn(async () => {
			await Promise.resolve();
			return jsonResponse({ choices: [{ message: { content: "hello" } }] });
		});
		global.fetch = fetchMock;

		const result = await generateText({ messages: [{ role: "user", content: "hi" }] });

		expect(result.placeholder).toBe(false);
		expect(result.text).toBe("hello");
		const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
	});

	it("routes the gemini adapter with header auth and thinkingBudget disabled", async () => {
		process.env.AI_PROVIDER_KIND = "gemini";
		process.env.AI_API_KEY = "gem-key";
		process.env.AI_DEFAULT_MODEL = "gemini-2.5-flash";
		resetAiConfigCache();
		resetProviderCache();

		const fetchMock = jest.fn(async () => {
			await Promise.resolve();
			return jsonResponse({ candidates: [{ content: { parts: [{ text: "summary" }] } }] });
		});
		global.fetch = fetchMock;

		const result = await generateText({
			task: "summary",
			messages: [
				{ role: "system", content: "be terse" },
				{ role: "user", content: "hi" },
			],
			maxOutputTokens: 120,
		});

		expect(result.text).toBe("summary");
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
		);
		expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("gem-key");
		const body = JSON.parse(init.body as string) as {
			systemInstruction?: { parts: { text: string }[] };
			generationConfig: { thinkingConfig: { thinkingBudget: number } };
		};
		expect(body.systemInstruction?.parts[0]?.text).toBe("be terse");
		expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
	});

	it("uses OpenRouter as the sole provider (free model) when only its key is set", async () => {
		process.env.OPENROUTER_API_KEY = "or-key";
		resetAiConfigCache();
		resetProviderCache();

		expect(isAiEnabled()).toBe(true);
		const fetchMock = jest.fn(async () => {
			await Promise.resolve();
			return jsonResponse({ choices: [{ message: { content: "free-summary" } }] });
		});
		global.fetch = fetchMock;

		const result = await generateText({ messages: [{ role: "user", content: "hi" }] });

		expect(result.placeholder).toBe(false);
		expect(result.provider).toBe("openrouter");
		expect(result.text).toBe("free-summary");
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
		const body = JSON.parse(init.body as string) as { model: string };
		expect(body.model).toBe("deepseek/deepseek-chat-v3-0324:free");
	});

	it("falls back to OpenRouter when the primary provider fails", async () => {
		process.env.AI_PROVIDER_KIND = "gemini";
		process.env.AI_API_KEY = "gem-key";
		process.env.AI_DEFAULT_MODEL = "gemini-2.5-flash";
		process.env.OPENROUTER_API_KEY = "or-key";
		process.env.AI_FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
		resetAiConfigCache();
		resetProviderCache();

		const fetchMock = jest.fn(async (input: unknown) => {
			await Promise.resolve();
			const url = String(input);
			if (new URL(url).hostname === "generativelanguage.googleapis.com") {
				return { ok: false, status: 503 } as Response; // primary (Gemini) is down
			}
			return jsonResponse({ choices: [{ message: { content: "fallback-text" } }] });
		});
		global.fetch = fetchMock;

		const result = await generateText({
			task: "summary",
			messages: [{ role: "user", content: "hi" }],
		});

		expect(result.provider).toBe("openrouter");
		expect(result.text).toBe("fallback-text");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		const [fallbackUrl] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
		expect(fallbackUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
	});

	it("reads legacy GEMINI_API_KEY/GEMINI_MODEL when AI_PROVIDER_KIND is unset", async () => {
		/* eslint-disable-next-line @typescript-eslint/no-deprecated -- test asserts the deprecated legacy-var backward-compat path still resolves */
		process.env.GEMINI_API_KEY = "legacy-gem-key";
		/* eslint-disable-next-line @typescript-eslint/no-deprecated -- test asserts the deprecated legacy-var backward-compat path still resolves */
		process.env.GEMINI_MODEL = "gemini-2.5-flash";
		resetAiConfigCache();
		resetProviderCache();

		expect(isAiEnabled()).toBe(true);
		const fetchMock = jest.fn(async () => {
			await Promise.resolve();
			return jsonResponse({ candidates: [{ content: { parts: [{ text: "legacy" }] } }] });
		});
		global.fetch = fetchMock;

		const result = await generateText({ messages: [{ role: "user", content: "hi" }] });

		expect(result.placeholder).toBe(false);
		expect(result.text).toBe("legacy");
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(
			"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
		);
		expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("legacy-gem-key");
	});

	it("throws a clear error when enabled without a model and no fallback", async () => {
		process.env.AI_PROVIDER_KIND = "gemini";
		process.env.AI_API_KEY = "gem-key";
		// No AI_DEFAULT_MODEL and no OPENROUTER_API_KEY: misconfiguration, must fail loud.
		resetAiConfigCache();
		resetProviderCache();

		expect(isAiEnabled()).toBe(true);
		await expect(generateText({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(
			AiConfigError,
		);
	});
});
