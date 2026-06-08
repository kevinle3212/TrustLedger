import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
	locales: ["en", "es", "vi", "pt", "zh-CN", "ar", "fr", "hi"],
	defaultLocale: "en",
});
