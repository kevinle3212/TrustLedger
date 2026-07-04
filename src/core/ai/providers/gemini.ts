import "server-only";

import type {
	AiCompletionRequest,
	AiCompletionResult,
	AiProvider,
	AiProviderConfig,
	AiStreamChunk,
} from "@/core/ai/types";

/**
 * Adapter for Google's Gemini generative-language API. Gemini does not speak the
 * OpenAI Chat Completions protocol, so it needs its own adapter: system messages
 * map to `systemInstruction`, `assistant` maps to the `model` role, and the key
 * travels in the `x-goog-api-key` header (never the URL, so it can't leak into
 * access logs). `thinkingBudget: 0` is set because the 2.5 "flash" models are
 * thinking models whose reasoning would otherwise consume `maxOutputTokens` and
 * truncate short outputs. The concrete model and key stay data, so no vendor
 * detail leaks into call sites.
 */
export class GeminiProvider implements AiProvider {
	public readonly name: string;
	private readonly baseUrl: string;
	private readonly apiKey: string;

	public constructor(config: AiProviderConfig) {
		this.name = config.name;
		this.baseUrl = (
			config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"
		).replace(/\/$/, "");
		this.apiKey = config.apiKey ?? "";
	}

	public isConfigured(): boolean {
		return this.apiKey !== "";
	}

	private endpoint(model: string, stream: boolean): string {
		const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
		return `${this.baseUrl}/models/${model}:${method}`;
	}

	private headers(): Record<string, string> {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (this.apiKey !== "") headers["x-goog-api-key"] = this.apiKey;
		return headers;
	}

	private body(request: AiCompletionRequest): string {
		// Single pass: system messages fold into `systemInstruction`, the rest map
		// to Gemini `contents` turns (`assistant` -> `model`).
		const systemParts: string[] = [];
		const contents: { role: string; parts: { text: string }[] }[] = [];
		for (const m of request.messages) {
			if (m.role === "system") {
				systemParts.push(m.content);
			} else {
				contents.push({
					role: m.role === "assistant" ? "model" : "user",
					parts: [{ text: m.content }],
				});
			}
		}
		const system = systemParts.join("\n\n");
		return JSON.stringify({
			...(system === "" ? {} : { systemInstruction: { parts: [{ text: system }] } }),
			contents,
			generationConfig: {
				...(request.temperature === undefined ? {} : { temperature: request.temperature }),
				...(request.maxOutputTokens === undefined
					? {}
					: { maxOutputTokens: request.maxOutputTokens }),
				thinkingConfig: { thinkingBudget: 0 },
			},
		});
	}

	public async complete(
		request: AiCompletionRequest,
		model: string,
	): Promise<AiCompletionResult> {
		const start = Date.now();
		const response = await fetch(this.endpoint(model, false), {
			method: "POST",
			headers: this.headers(),
			body: this.body(request),
			...(request.signal === undefined ? {} : { signal: request.signal }),
		});
		if (!response.ok) {
			throw new Error(`AI provider "${this.name}" returned HTTP ${String(response.status)}`);
		}
		const json = (await response.json()) as {
			candidates?: { content?: { parts?: { text?: string }[] } }[];
			usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
		};
		const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
		const meta = json.usageMetadata;
		const usage =
			meta === undefined
				? undefined
				: {
						...(meta.promptTokenCount === undefined
							? {}
							: { inputTokens: meta.promptTokenCount }),
						...(meta.candidatesTokenCount === undefined
							? {}
							: { outputTokens: meta.candidatesTokenCount }),
					};
		return {
			text,
			provider: this.name,
			model,
			latencyMs: Date.now() - start,
			placeholder: false,
			...(usage === undefined ? {} : { usage }),
		};
	}

	public async *stream(
		request: AiCompletionRequest,
		model: string,
	): AsyncIterable<AiStreamChunk> {
		const response = await fetch(this.endpoint(model, true), {
			method: "POST",
			headers: this.headers(),
			body: this.body(request),
			...(request.signal === undefined ? {} : { signal: request.signal }),
		});
		if (!response.ok || response.body === null) {
			throw new Error(`AI provider "${this.name}" returned HTTP ${String(response.status)}`);
		}
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			// Gemini SSE (`alt=sse`): events are separated by blank lines and each
			// `data:` line carries a JSON chunk with incremental candidate text.
			const events = buffer.split("\n\n");
			buffer = events.pop() ?? "";
			for (const event of events) {
				for (const line of event.split("\n")) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data:")) continue;
					const payload = trimmed.slice(5).trim();
					if (payload === "") continue;
					try {
						const parsed = JSON.parse(payload) as {
							candidates?: { content?: { parts?: { text?: string }[] } }[];
						};
						const delta =
							parsed.candidates?.[0]?.content?.parts
								?.map((p) => p.text ?? "")
								.join("") ?? "";
						if (delta !== "") yield { delta };
					} catch {
						// Ignore malformed keep-alive/comment lines.
					}
				}
			}
		}
	}
}
