import "server-only";

import {
	DISABLED_PROVIDER,
	defaultModelName,
	defaultProviderName,
	providerConfigs,
	taskRoutes,
} from "@/core/ai/config";
import type { AiCompletionRequest, AiRoute } from "@/core/ai/types";

/**
 * Resolves which provider and model a request should use. Precedence:
 *   1. Explicit `request.provider` / `request.model`.
 *   2. Per-task route from `AI_ROUTES_JSON` keyed by `request.task`.
 *   3. Global defaults (`AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL`).
 *   4. The provider's own `defaultModel`, else the `disabled` provider.
 *
 * Routing is pure config: no provider names are hardcoded here.
 */
export function resolveRoute(request: AiCompletionRequest): AiRoute {
	const routes = taskRoutes();
	const taskRoute = request.task === undefined ? undefined : routes[request.task];

	const provider = request.provider ?? taskRoute?.provider ?? defaultProviderName();

	const providerConfig = providerConfigs().find((p) => p.name === provider);
	const model =
		request.model ??
		taskRoute?.model ??
		defaultModelName() ??
		providerConfig?.defaultModel ??
		"";

	// If we couldn't resolve a usable provider/model, fall back to the placeholder.
	if (providerConfig === undefined || (providerConfig.kind !== "disabled" && model === "")) {
		return { provider: DISABLED_PROVIDER, model: model === "" ? "placeholder" : model };
	}
	return { provider, model: model === "" ? "placeholder" : model };
}
