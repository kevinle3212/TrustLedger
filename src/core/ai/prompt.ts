import type { AiMessage } from "@/core/ai/types";

/**
 * Minimal, dependency-free prompt templating. Keeps prompt text out of call
 * sites and interpolates `{{variable}}` placeholders from a typed value map.
 * Unknown placeholders are left intact so partially-filled templates are
 * detectable rather than silently blanked.
 */
export interface PromptTemplate<V extends Record<string, string | number>> {
	/** Optional system instruction rendered as the leading system message. */
	readonly system?: string;
	/** User message body with `{{variable}}` placeholders. */
	readonly user: string;
	/** The variable names this template expects (for documentation/validation). */
	readonly variables: readonly (keyof V)[];
}

function interpolate(text: string, values: Record<string, string | number>): string {
	return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
		const value = values[key];
		return value === undefined ? match : String(value);
	});
}

/**
 * Renders a template to the neutral {@link AiMessage} list consumed by the AI
 * service. A leading system message is included only when the template has one.
 */
export function renderPrompt<V extends Record<string, string | number>>(
	template: PromptTemplate<V>,
	values: V,
): AiMessage[] {
	const messages: AiMessage[] = [];
	if (template.system !== undefined && template.system !== "") {
		messages.push({ role: "system", content: interpolate(template.system, values) });
	}
	messages.push({ role: "user", content: interpolate(template.user, values) });
	return messages;
}

/** Type-safe helper for declaring a template with its variable set. */
export function definePrompt<V extends Record<string, string | number>>(
	template: PromptTemplate<V>,
): PromptTemplate<V> {
	return template;
}
