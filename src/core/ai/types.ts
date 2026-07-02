/**
 * Provider-agnostic AI type contracts.
 *
 * Nothing here names a concrete vendor. Providers are described by data
 * (see {@link AiProviderConfig}) and implemented behind {@link AiProvider}, so
 * new backends (OpenAI, Groq, Anthropic, Gemini, a local model, a gateway…) can
 * be added without touching call sites or this file. See `core/ai/README` in
 * NOTES.md for the architecture overview.
 */

/** Conversational role for a single message. */
export type AiRole = "system" | "user" | "assistant";

/** One message in a chat-style prompt. */
export interface AiMessage {
	readonly role: AiRole;
	readonly content: string;
}

/** Abstract task identifier used for model routing (e.g. "summary", "chat"). */
export type AiTask = string;

/** A request for a single completion. */
export interface AiCompletionRequest {
	/** Ordered messages; a leading system message is recommended. */
	readonly messages: readonly AiMessage[];
	/** Logical task, used by the router to pick a provider/model. */
	readonly task?: AiTask;
	/** Explicit provider name; overrides routing when set. */
	readonly provider?: string;
	/** Explicit model id; overrides routing when set. */
	readonly model?: string;
	/** Sampling temperature (0–2). Provider default when omitted. */
	readonly temperature?: number;
	/** Hard cap on output tokens. Provider default when omitted. */
	readonly maxOutputTokens?: number;
	/** Abort signal for cancellation/timeouts. */
	readonly signal?: AbortSignal;
}

/** Token accounting for a completion, when the provider reports it. */
export interface AiUsage {
	readonly inputTokens?: number;
	readonly outputTokens?: number;
}

/** The result of a non-streaming completion. */
export interface AiCompletionResult {
	readonly text: string;
	readonly provider: string;
	readonly model: string;
	readonly usage?: AiUsage;
	/** Wall-clock latency in milliseconds. */
	readonly latencyMs: number;
	/** True when served by the disabled/placeholder provider. */
	readonly placeholder: boolean;
}

/** A chunk of a streamed completion. */
export interface AiStreamChunk {
	/** Incremental text delta. */
	readonly delta: string;
}

/**
 * A concrete AI backend. Implementations are pure adapters: they translate the
 * neutral request/response shapes to and from a specific API. They never read
 * global config directly — everything they need is injected at construction.
 */
export interface AiProvider {
	/** Registry name, e.g. the value used in `AI_DEFAULT_PROVIDER`. */
	readonly name: string;
	/** True when the provider has the configuration it needs to make real calls. */
	readonly isConfigured: () => boolean;
	/** Runs a single completion. */
	readonly complete: (request: AiCompletionRequest, model: string) => Promise<AiCompletionResult>;
	/** Streams a completion as an async iterable of text deltas. */
	readonly stream: (request: AiCompletionRequest, model: string) => AsyncIterable<AiStreamChunk>;
}

/** Supported adapter kinds. Extend the union when adding a new adapter family. */
export type AiProviderKind = "openai-compatible" | "disabled";

/** Declarative description of a provider instance, sourced from configuration. */
export interface AiProviderConfig {
	/** Unique registry name. */
	readonly name: string;
	/** Adapter family used to build the provider. */
	readonly kind: AiProviderKind;
	/** Base URL for HTTP adapters (e.g. an OpenAI-compatible `/v1` endpoint). */
	readonly baseUrl?: string;
	/** Resolved API key (already read from its env var), if any. */
	readonly apiKey?: string;
	/** Default model for this provider when a request doesn't specify one. */
	readonly defaultModel?: string;
}

/** A resolved routing decision: which provider and model to use. */
export interface AiRoute {
	readonly provider: string;
	readonly model: string;
}
