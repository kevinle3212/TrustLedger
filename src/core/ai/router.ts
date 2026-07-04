import "server-only";

import {
	AiConfigError,
	DISABLED_PROVIDER,
	defaultModelName,
	defaultProviderName,
	fallbackProviderName,
	isAiEnabled,
	providerConfigs,
	taskRoutes,
} from "@/core/ai/config";
import type { AiCompletionRequest, AiRoute } from "@/core/ai/types";

/** Model id reported for the placeholder/disabled provider. */
const PLACEHOLDER_MODEL = "placeholder";

/**
 * Resolves the primary provider+model for a request. Precedence:
 *   1. Explicit `request.provider` / `request.model`.
 *   2. Per-task route from `AI_ROUTES_JSON` keyed by `request.task`.
 *   3. Global defaults (`AI_DEFAULT_PROVIDER` / `AI_DEFAULT_MODEL`).
 *   4. The provider's own `defaultModel`.
 *
 * Returns `undefined` when the selected provider is missing/disabled or has no
 * usable model, so the caller can decide between the fallback and a loud error.
 */
function primaryRoute(request: AiCompletionRequest): AiRoute | undefined {
	const routes = taskRoutes();
	const taskRoute = request.task === undefined ? undefined : routes[request.task];
	const provider = request.provider ?? taskRoute?.provider ?? defaultProviderName();
	const providerConfig = providerConfigs().find((p) => p.name === provider);
	if (providerConfig === undefined || providerConfig.kind === "disabled") return undefined;
	const model =
		request.model ??
		taskRoute?.model ??
		defaultModelName() ??
		providerConfig.defaultModel ??
		"";
	if (model === "") return undefined;
	return { provider, model };
}

/**
 * Resolves the OpenRouter fallback route for a request, or `undefined` when the
 * fallback is unconfigured or would duplicate the primary provider. Uses an
 * explicit `request.model` when given, else the fallback provider's own model.
 */
function fallbackRoute(
	request: AiCompletionRequest,
	primary: AiRoute | undefined,
): AiRoute | undefined {
	const name = fallbackProviderName();
	if (name === undefined || primary?.provider === name) return undefined;
	const providerConfig = providerConfigs().find((p) => p.name === name);
	const model = request.model ?? providerConfig?.defaultModel ?? "";
	if (providerConfig === undefined || model === "") return undefined;
	return { provider: name, model };
}

/**
 * Ordered provider/model routes to attempt: the primary route first, then the
 * OpenRouter fallback when configured. Throws {@link AiConfigError} when AI is
 * enabled but no usable route (primary or fallback) can be resolved — a
 * misconfiguration surfaced loudly rather than degraded to a silent placeholder.
 * When AI is off, returns a single disabled/placeholder route.
 *
 * Routing is pure config: no provider names are hardcoded here.
 */
export function resolveRouteChain(request: AiCompletionRequest): [AiRoute, ...AiRoute[]] {
	const primary = primaryRoute(request);
	const fallback = fallbackRoute(request, primary);
	if (primary !== undefined) return fallback === undefined ? [primary] : [primary, fallback];
	if (fallback !== undefined) return [fallback];
	if (isAiEnabled()) {
		const scope = request.task === undefined ? "the default route" : `task "${request.task}"`;
		throw new AiConfigError(
			`AI is enabled but no usable model is configured for ${scope}. Set AI_DEFAULT_MODEL ` +
				"(or a per-task AI_ROUTES_JSON entry), or set OPENROUTER_API_KEY to use the free fallback.",
		);
	}
	return [{ provider: DISABLED_PROVIDER, model: PLACEHOLDER_MODEL }];
}

/**
 * Single-route resolver: the first route the chain would attempt. Retained for
 * back-compat and simple call sites. Throws {@link AiConfigError} on the same
 * misconfiguration as {@link resolveRouteChain}; returns the disabled
 * placeholder when AI is off.
 */
export function resolveRoute(request: AiCompletionRequest): AiRoute {
	return resolveRouteChain(request)[0];
}
