import "server-only";

import { getProvider } from "@/core/ai/registry";
import { resolveRoute } from "@/core/ai/router";
import type { AiCompletionRequest, AiCompletionResult, AiStreamChunk } from "@/core/ai/types";

/**
 * High-level AI entry point. Call sites depend only on these two functions and
 * the neutral request/result types — never on a specific provider. Routing,
 * provider selection, streaming, and the disabled-fallback are handled here.
 */

/** Generates a single completion, routing to the configured provider. */
export async function generateText(request: AiCompletionRequest): Promise<AiCompletionResult> {
	const route = resolveRoute(request);
	const provider = getProvider(route.provider);
	return await provider.complete(request, route.model);
}

/**
 * Streams a completion as an async iterable of text deltas. Consume with
 * `for await (const chunk of streamText(...))`. Falls back to the placeholder
 * provider when nothing real is configured.
 */
export function streamText(request: AiCompletionRequest): AsyncIterable<AiStreamChunk> {
	const route = resolveRoute(request);
	const provider = getProvider(route.provider);
	return provider.stream(request, route.model);
}

/**
 * Collects a streamed completion into a single string. Convenience for callers
 * that want streaming semantics upstream but a whole string locally (e.g. tests).
 */
export async function collectStream(request: AiCompletionRequest): Promise<string> {
	let text = "";
	for await (const chunk of streamText(request)) {
		text += chunk.delta;
	}
	return text;
}
