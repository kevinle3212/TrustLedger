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

function flattenMessageKeys(tree: MessageTree, prefix = ""): string[] {
	return Object.entries(tree).flatMap(([key, value]) => {
		const nextPrefix = prefix === "" ? key : `${prefix}.${key}`;
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			return flattenMessageKeys(value as MessageTree, nextPrefix);
		}
		return [nextPrefix];
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
});
