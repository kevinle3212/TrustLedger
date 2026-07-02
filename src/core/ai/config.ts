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
		const kind = entry.kind === "openai-compatible" ? "openai-compatible" : "disabled";
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
	if (kind !== "openai-compatible") return undefined;
	const baseUrl = readEnv("AI_BASE_URL");
	if (baseUrl === undefined) return undefined;
	const apiKey = readEnv("AI_API_KEY");
	const defaultModel = readEnv("AI_DEFAULT_MODEL");
	return {
		name: "default",
		kind: "openai-compatible",
		baseUrl,
		...(apiKey === undefined ? {} : { apiKey }),
		...(defaultModel === undefined ? {} : { defaultModel }),
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
	configured.push({ name: DISABLED_PROVIDER, kind: "disabled" });
	cachedProviders = configured;
	return configured;
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
