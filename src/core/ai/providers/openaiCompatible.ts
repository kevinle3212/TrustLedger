import "server-only";

import type {
	AiCompletionRequest,
	AiCompletionResult,
	AiProvider,
	AiProviderConfig,
	AiStreamChunk,
} from "@/core/ai/types";

/**
 * Adapter for any service that speaks the OpenAI Chat Completions protocol —
 * OpenAI, Groq, Together, OpenRouter, a self-hosted model, or the Vercel AI
 * Gateway. The concrete vendor is data (`baseUrl` + `apiKey` + model), so no
 * provider is hardcoded. Supports both single-shot and SSE streaming responses.
 */
export class OpenAiCompatibleProvider implements AiProvider {
	public readonly name: string;
	private readonly baseUrl: string;
	private readonly apiKey: string;

	public constructor(config: AiProviderConfig) {
		this.name = config.name;
		this.baseUrl = (config.baseUrl ?? "").replace(/\/$/, "");
		this.apiKey = config.apiKey ?? "";
	}

	public isConfigured(): boolean {
		return this.baseUrl !== "";
	}

	private endpoint(): string {
		return `${this.baseUrl}/chat/completions`;
	}

	private headers(): Record<string, string> {
		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (this.apiKey !== "") headers["Authorization"] = `Bearer ${this.apiKey}`;
		return headers;
	}

	private body(request: AiCompletionRequest, model: string, stream: boolean): string {
		return JSON.stringify({
			model,
			messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
			stream,
			...(request.temperature === undefined ? {} : { temperature: request.temperature }),
			...(request.maxOutputTokens === undefined
				? {}
				: { max_tokens: request.maxOutputTokens }),
		});
	}

	public async complete(
		request: AiCompletionRequest,
		model: string,
	): Promise<AiCompletionResult> {
		const start = Date.now();
		const response = await fetch(this.endpoint(), {
			method: "POST",
			headers: this.headers(),
			body: this.body(request, model, false),
			...(request.signal === undefined ? {} : { signal: request.signal }),
		});
		if (!response.ok) {
			throw new Error(`AI provider "${this.name}" returned HTTP ${String(response.status)}`);
		}
		const json = (await response.json()) as {
			choices?: { message?: { content?: string } }[];
			usage?: { prompt_tokens?: number; completion_tokens?: number };
		};
		const text = json.choices?.[0]?.message?.content ?? "";
		const usage =
			json.usage === undefined
				? undefined
				: {
						...(json.usage.prompt_tokens === undefined
							? {}
							: { inputTokens: json.usage.prompt_tokens }),
						...(json.usage.completion_tokens === undefined
							? {}
							: { outputTokens: json.usage.completion_tokens }),
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
		const response = await fetch(this.endpoint(), {
			method: "POST",
			headers: this.headers(),
			body: this.body(request, model, true),
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
			// Server-Sent Events: events are separated by blank lines; each `data:`
			// line carries a JSON chunk, terminated by a literal `[DONE]`.
			const events = buffer.split("\n\n");
			buffer = events.pop() ?? "";
			for (const event of events) {
				for (const line of event.split("\n")) {
					const trimmed = line.trim();
					if (!trimmed.startsWith("data:")) continue;
					const payload = trimmed.slice(5).trim();
					if (payload === "" || payload === "[DONE]") continue;
					try {
						const parsed = JSON.parse(payload) as {
							choices?: { delta?: { content?: string } }[];
						};
						const delta = parsed.choices?.[0]?.delta?.content;
						if (delta !== undefined && delta !== "") yield { delta };
					} catch {
						// Ignore malformed keep-alive/comment lines.
					}
				}
			}
		}
	}
}
