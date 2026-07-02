import "server-only";

/**
 * Provider-agnostic AI infrastructure (Phase 4 foundation).
 *
 * Public surface: import from `@/core/ai` only. Concrete providers live behind
 * the registry and are selected by configuration + routing, so features never
 * name a vendor. See NOTES.md ("AI infrastructure") for the architecture,
 * required env vars, and how to add a provider.
 *
 * Server-only — do not import from Client Components.
 */
export type {
	AiCompletionRequest,
	AiCompletionResult,
	AiMessage,
	AiProvider,
	AiProviderConfig,
	AiProviderKind,
	AiRole,
	AiRoute,
	AiStreamChunk,
	AiTask,
	AiUsage,
} from "@/core/ai/types";
export { definePrompt, renderPrompt, type PromptTemplate } from "@/core/ai/prompt";
export { generateText, streamText, collectStream } from "@/core/ai/service";
export { resolveRoute } from "@/core/ai/router";
export { getProvider, resetProviderCache } from "@/core/ai/registry";
export {
	isAiEnabled,
	defaultProviderName,
	defaultModelName,
	providerConfigs,
	taskRoutes,
	resetAiConfigCache,
	DISABLED_PROVIDER,
} from "@/core/ai/config";
