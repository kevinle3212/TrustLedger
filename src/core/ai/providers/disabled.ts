import "server-only";

import type {
	AiCompletionRequest,
	AiCompletionResult,
	AiProvider,
	AiStreamChunk,
} from "@/core/ai/types";

/**
 * Placeholder provider used when no real AI backend is configured. It never
 * calls the network: it returns a clearly-marked, deterministic message so the
 * rest of the app (and tests) can exercise the AI code paths without keys. All
 * results are flagged `placeholder: true`.
 */
export class DisabledAiProvider implements AiProvider {
	public readonly name: string;

	public constructor(name: string) {
		this.name = name;
	}

	public isConfigured(): boolean {
		return true;
	}

	public async complete(
		_request: AiCompletionRequest,
		model: string,
	): Promise<AiCompletionResult> {
		await Promise.resolve();
		return {
			text: "AI features are not configured. Set an AI provider in the environment to enable generated responses.",
			provider: this.name,
			model,
			latencyMs: 0,
			placeholder: true,
		};
	}

	public async *stream(
		_request: AiCompletionRequest,
		_model: string,
	): AsyncIterable<AiStreamChunk> {
		await Promise.resolve();
		yield { delta: "AI features are not configured." };
	}
}
