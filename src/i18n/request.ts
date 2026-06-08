import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(
	async ({ requestLocale }): Promise<{ locale: string; messages: Record<string, string> }> => {
		const requested = await requestLocale;
		const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
		const mod = (await import(`../messages/${locale}.json`)) as {
			default: Record<string, string>;
		};
		const messages = mod.default;
		return {
			locale,
			messages,
		};
	},
);
