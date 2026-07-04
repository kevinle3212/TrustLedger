import "server-only";

import { DISABLED_PROVIDER, providerConfigs } from "@/core/ai/config";
import { DisabledAiProvider } from "@/core/ai/providers/disabled";
import { GeminiProvider } from "@/core/ai/providers/gemini";
import { OpenAiCompatibleProvider } from "@/core/ai/providers/openaiCompatible";
import type { AiProvider, AiProviderConfig, AiProviderKind } from "@/core/ai/types";

/**
 * Builds and caches {@link AiProvider} instances from configuration. Adapters
 * are keyed by {@link AiProviderKind}, so adding a new backend family is a
 * one-line registration here plus a new adapter file — call sites never change.
 */

type AdapterFactory = (config: AiProviderConfig) => AiProvider;

const ADAPTERS: Record<AiProviderKind, AdapterFactory> = {
	"openai-compatible": (config) => new OpenAiCompatibleProvider(config),
	"gemini": (config) => new GeminiProvider(config),
	"disabled": (config) => new DisabledAiProvider(config.name),
};

const instances = new Map<string, AiProvider>();

/** Returns the provider registered under `name`, falling back to `disabled`. */
export function getProvider(name: string): AiProvider {
	const cached = instances.get(name);
	if (cached !== undefined) return cached;

	const configs = providerConfigs();
	const config =
		configs.find((c) => c.name === name) ??
		configs.find((c) => c.name === DISABLED_PROVIDER) ??
		({ name: DISABLED_PROVIDER, kind: "disabled" } satisfies AiProviderConfig);

	const provider = ADAPTERS[config.kind](config);
	instances.set(name, provider);
	return provider;
}

/** Test-only: drops cached provider instances so config changes take effect. */
export function resetProviderCache(): void {
	instances.clear();
}
