import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { routing } from "./routing";
import ar from "../messages/ar.json";
import en from "../messages/en.json";
import es from "../messages/es.json";
import fr from "../messages/fr.json";
import hi from "../messages/hi.json";
import pt from "../messages/pt.json";
import vi from "../messages/vi.json";
import zhCN from "../messages/zh-CN.json";

const MESSAGES: Record<(typeof routing.locales)[number], AbstractIntlMessages> = {
	ar,
	en,
	es,
	fr,
	hi,
	pt,
	vi,
	"zh-CN": zhCN,
};

export default getRequestConfig(
	async ({ requestLocale }): Promise<{ locale: string; messages: AbstractIntlMessages }> => {
		const requested = await requestLocale;
		const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
		return {
			locale,
			messages: MESSAGES[locale],
		};
	},
);
