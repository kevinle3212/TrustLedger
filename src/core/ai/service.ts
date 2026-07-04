import "server-only";

import { getProvider } from "@/core/ai/registry";
import { resolveRouteChain } from "@/core/ai/router";
import type {
	AiCompletionRequest,
	AiCompletionResult,
	AiRoute,
	AiStreamChunk,
} from "@/core/ai/types";

/**
 * High-level AI entry point. Call sites depend only on these two functions and
 * the neutral request/result types — never on a specific provider. Routing,
 * provider selection, streaming, the OpenRouter fallback, and the
 * disabled-placeholder are handled here.
 */

/**
 * Generates a single completion, routing to the configured provider. If the
 * primary provider throws (network error, rate limit, HTTP error) and an
 * OpenRouter fallback is configured, the request is retried once against it.
 */
export async function generateText(request: AiCompletionRequest): Promise<AiCompletionResult> {
	const [primary, fallback] = resolveRouteChain(request);
	try {
		return await getProvider(primary.provider).complete(request, primary.model);
	} catch (error) {
		if (fallback === undefined) throw error;
		return await getProvider(fallback.provider).complete(request, fallback.model);
	}
}

/**
 * Streams a completion as an async iterable of text deltas. Consume with
 * `for await (const chunk of streamText(...))`. Returns the placeholder provider
 * when nothing real is configured. If the primary provider fails before it
 * emits any chunk and an OpenRouter fallback is configured, the fallback takes
 * over; a failure after streaming has begun is not silently swapped.
 */
export function streamText(request: AiCompletionRequest): AsyncIterable<AiStreamChunk> {
	const [primary, fallback] = resolveRouteChain(request);
	return streamWithFallback(request, primary, fallback);
}

/** Streams the primary route, switching to the fallback only on a pre-first-chunk failure. */
async function* streamWithFallback(
	request: AiCompletionRequest,
	primary: AiRoute,
	fallback: AiRoute | undefined,
): AsyncIterable<AiStreamChunk> {
	const iterator = getProvider(primary.provider)
		.stream(request, primary.model)
		[Symbol.asyncIterator]();
	let first: IteratorResult<AiStreamChunk>;
	try {
		first = await iterator.next();
	} catch (error) {
		if (fallback === undefined) throw error;
		yield* getProvider(fallback.provider).stream(request, fallback.model);
		return;
	}
	if (first.done === true) return;
	yield first.value;
	// Primary committed: drain the rest of the same iterator (no self-written loop).
	yield* { [Symbol.asyncIterator]: (): AsyncIterator<AiStreamChunk> => iterator };
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
