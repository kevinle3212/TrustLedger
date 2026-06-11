import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import frMessages from "@/messages/fr.json";
import hiMessages from "@/messages/hi.json";
import ptMessages from "@/messages/pt.json";
import viMessages from "@/messages/vi.json";
import zhCnMessages from "@/messages/zh-CN.json";

type MessageTree = Record<string, unknown>;

const localizedMessages = {
	"ar": arMessages,
	"es": esMessages,
	"fr": frMessages,
	"hi": hiMessages,
	"pt": ptMessages,
	"vi": viMessages,
	"zh-CN": zhCnMessages,
} satisfies Record<string, MessageTree>;

const PLACEHOLDER_TRANSLATION_PREFIX_PATTERN = /^(?:Tiếng Việt|Português|中文|العربية|हिन्दी):\s+/u;

function flattenMessageKeys(tree: MessageTree, prefix = ""): string[] {
	return Object.entries(tree).flatMap(([key, value]) => {
		const nextPrefix = prefix === "" ? key : `${prefix}.${key}`;
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			return flattenMessageKeys(value as MessageTree, nextPrefix);
		}
		return [nextPrefix];
	});
}

function flattenMessageValues(tree: MessageTree): string[] {
	return Object.values(tree).flatMap((value) => {
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			return flattenMessageValues(value as MessageTree);
		}
		return typeof value === "string" ? [value] : [];
	});
}

describe("locale message files", () => {
	it("keep every non-English locale structurally equivalent to English", () => {
		const englishKeys = flattenMessageKeys(enMessages).sort();

		for (const messages of Object.values(localizedMessages)) {
			const localeKeys = flattenMessageKeys(messages).sort();
			expect(localeKeys).toEqual(englishKeys);
		}
	});

	it("do not use placeholder-prefixed English locale values", () => {
		for (const messages of Object.values(localizedMessages)) {
			const placeholders = flattenMessageValues(messages).filter((value) =>
				PLACEHOLDER_TRANSLATION_PREFIX_PATTERN.test(value),
			);
			expect(placeholders).toEqual([]);
		}
	});
});
