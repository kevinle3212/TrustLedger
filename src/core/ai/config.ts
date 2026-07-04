import "server-only";

import type { AiProviderConfig, AiRoute } from "@/core/ai/types";

/**
 * Resolves AI configuration from the environment once. Everything is
 * data-driven so providers and routes can change without code edits.
 *
 * Two ways to declare providers:
 *  1. Simple single provider via discrete env vars (the common case):
 *     `AI_PROVIDER_KIND`, `AI_BASE_URL`, `AI_API_KEY`, `AI_DEFAULT_MODEL`.
 *  2. Advanced multi-provider via `AI_PROVIDERS_JSON` (array of
 *     {@link AiProviderConfig} minus the resolved key; each entry names an
 *     `apiKeyEnv` to read). Task→provider/model routing via `AI_ROUTES_JSON`.
 *
 * A built-in `disabled` provider always exists as a safe fallback, so the app
 * runs (returning clearly-marked placeholder output) with zero AI config.
 */

/** The always-present placeholder provider name. */
export const DISABLED_PROVIDER = "disabled";

/** Built-in OpenRouter fallback provider name. */
export const OPENROUTER_PROVIDER = "openrouter";

/** Default OpenRouter API base (speaks the OpenAI Chat Completions protocol). */
const OPENROUTER_BASE_URL_DEFAULT = "https://openrouter.ai/api/v1";

/**
 * Default model for the OpenRouter fallback. A free OpenRouter model is chosen
 * so the fallback works with zero cost out of the box; override with
 * `AI_FALLBACK_MODEL` (any OpenRouter model id; prefer `:free` ones).
 */
const DEFAULT_FALLBACK_MODEL = "deepseek/deepseek-chat-v3-0324:free";

/**
 * Thrown when AI is enabled (a real provider is configured) but no usable model
 * can be resolved for a request — a misconfiguration. It is surfaced loudly
 * instead of silently returning placeholder output, so a missing
 * `AI_DEFAULT_MODEL` / task route fails fast with a clear message.
 */
export class AiConfigError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "AiConfigError";
	}
}

function readEnv(key: string): string | undefined {
	const value = process.env[key];
	return value === undefined || value === "" ? undefined : value;
}

/** Whether any real (non-placeholder) AI provider is configured/enabled. */
export function isAiEnabled(): boolean {
	if (readEnv("AI_ENABLED") === "false") return false;
	return providerConfigs().some((p) => p.kind !== "disabled");
}

interface RawProvider {
	name?: string;
	kind?: string;
	baseUrl?: string;
	apiKeyEnv?: string;
	defaultModel?: string;
}

function parseJsonProviders(): AiProviderConfig[] {
	const raw = readEnv("AI_PROVIDERS_JSON");
	if (raw === undefined) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	const out: AiProviderConfig[] = [];
	for (const entry of parsed as RawProvider[]) {
		if (entry.name === undefined || entry.name === "") continue;
		const kind: AiProviderConfig["kind"] =
			entry.kind === "openai-compatible" || entry.kind === "gemini" ? entry.kind : "disabled";
		out.push({
			name: entry.name,
			kind,
			...(entry.baseUrl === undefined ? {} : { baseUrl: entry.baseUrl }),
			...(entry.apiKeyEnv === undefined ? {} : { apiKey: readEnv(entry.apiKeyEnv) ?? "" }),
			...(entry.defaultModel === undefined ? {} : { defaultModel: entry.defaultModel }),
		});
	}
	return out;
}

function simpleProvider(): AiProviderConfig | undefined {
	const kind = readEnv("AI_PROVIDER_KIND");
	if (kind !== "openai-compatible" && kind !== "gemini") return legacyProvider();
	const baseUrl = readEnv("AI_BASE_URL");
	// OpenAI-compatible needs an explicit base URL; gemini has a built-in default.
	if (kind === "openai-compatible" && baseUrl === undefined) return undefined;
	const apiKey = readEnv("AI_API_KEY");
	const defaultModel = readEnv("AI_DEFAULT_MODEL");
	return {
		name: "default",
		kind,
		...(baseUrl === undefined ? {} : { baseUrl }),
		...(apiKey === undefined ? {} : { apiKey }),
		...(defaultModel === undefined ? {} : { defaultModel }),
	};
}

/**
 * Backward compatibility for pre-unification deployments that still set the
 * provider-specific vars (`GEMINI_API_KEY` / `GEMINI_MODEL`, or `OPENAI_API_KEY`
 * / `OPENAI_BASE_URL` / `OPENAI_MODEL`) but not the unified `AI_PROVIDER_KIND`.
 * Preferred config is the unified `AI_*` set; these legacy vars are deprecated
 * and only consulted when no unified provider kind is declared. Gemini wins when
 * both legacy keys are present, matching the prior default provider.
 */
function legacyProvider(): AiProviderConfig | undefined {
	const geminiKey = readEnv("GEMINI_API_KEY");
	if (geminiKey !== undefined) {
		const geminiModel = readEnv("GEMINI_MODEL");
		return {
			name: "default",
			kind: "gemini",
			apiKey: geminiKey,
			...(geminiModel === undefined ? {} : { defaultModel: geminiModel }),
		};
	}
	const openaiKey = readEnv("OPENAI_API_KEY");
	const openaiBaseUrl = readEnv("OPENAI_BASE_URL");
	// The openai-compatible adapter requires a base URL; without one we cannot route.
	if (openaiKey === undefined || openaiBaseUrl === undefined) return undefined;
	const openaiModel = readEnv("OPENAI_MODEL");
	return {
		name: "default",
		kind: "openai-compatible",
		baseUrl: openaiBaseUrl,
		apiKey: openaiKey,
		...(openaiModel === undefined ? {} : { defaultModel: openaiModel }),
	};
}

/**
 * The built-in OpenRouter fallback provider, present only when
 * `OPENROUTER_API_KEY` is set. OpenRouter speaks the OpenAI Chat Completions
 * protocol, so it reuses the openai-compatible adapter. Its base URL and model
 * default to OpenRouter's public endpoint and a free model; both are
 * overridable (`OPENROUTER_BASE_URL`, `AI_FALLBACK_MODEL`).
 */
function openrouterProvider(): AiProviderConfig | undefined {
	const apiKey = readEnv("OPENROUTER_API_KEY");
	if (apiKey === undefined) return undefined;
	return {
		name: OPENROUTER_PROVIDER,
		kind: "openai-compatible",
		baseUrl: readEnv("OPENROUTER_BASE_URL") ?? OPENROUTER_BASE_URL_DEFAULT,
		apiKey,
		defaultModel: readEnv("AI_FALLBACK_MODEL") ?? DEFAULT_FALLBACK_MODEL,
	};
}

let cachedProviders: AiProviderConfig[] | undefined;

/** All configured provider descriptions, including the built-in `disabled` one. */
export function providerConfigs(): AiProviderConfig[] {
	if (cachedProviders !== undefined) return cachedProviders;
	const configured = [...parseJsonProviders()];
	const simple = simpleProvider();
	if (simple !== undefined && !configured.some((p) => p.name === simple.name)) {
		configured.push(simple);
	}
	const openrouter = openrouterProvider();
	if (openrouter !== undefined && !configured.some((p) => p.name === openrouter.name)) {
		configured.push(openrouter);
	}
	configured.push({ name: DISABLED_PROVIDER, kind: "disabled" });
	cachedProviders = configured;
	return configured;
}

/**
 * Name of the built-in fallback provider (OpenRouter) when configured, else
 * `undefined`. The router appends it after the primary route so a primary
 * failure or an unconfigured primary transparently retries a free model.
 */
export function fallbackProviderName(): string | undefined {
	return providerConfigs().some((p) => p.name === OPENROUTER_PROVIDER)
		? OPENROUTER_PROVIDER
		: undefined;
}

/** The default provider name (first real provider, else `disabled`). */
export function defaultProviderName(): string {
	const explicit = readEnv("AI_DEFAULT_PROVIDER");
	if (explicit !== undefined) return explicit;
	const real = providerConfigs().find((p) => p.kind !== "disabled");
	return real?.name ?? DISABLED_PROVIDER;
}

/** The global default model, if configured. */
export function defaultModelName(): string | undefined {
	const explicit = readEnv("AI_DEFAULT_MODEL");
	if (explicit !== undefined) return explicit;
	const provider = providerConfigs().find((p) => p.name === defaultProviderName());
	return provider?.defaultModel;
}

/** Per-task routing overrides: `{ "<task>": { "provider": "...", "model": "..." } }`. */
export function taskRoutes(): Record<string, AiRoute> {
	const raw = readEnv("AI_ROUTES_JSON");
	if (raw === undefined) return {};
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (parsed === null || typeof parsed !== "object") return {};
		return parsed as Record<string, AiRoute>;
	} catch {
		return {};
	}
}

/** Test-only: clears the memoized provider list so env changes take effect. */
export function resetAiConfigCache(): void {
	cachedProviders = undefined;
}
