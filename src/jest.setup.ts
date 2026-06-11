import "@testing-library/jest-dom";
import React from "react";
import { TextDecoder, TextEncoder } from "node:util";
import { installBrowserMocks } from "./tests/unit/__mocks__/browser";

jest.mock("server-only", () => ({}), { virtual: true });

const testMessages: Record<string, string> = {
	"Create.insertSnippetAria": "Insert {label} terms snippet",
	"Create.uploadTermsImage": "Upload Contract Terms Image",
	"Create.termsEditorAria": "Collaborative Contract Terms Editor",
	"Create.lastUpdated": "Last Updated:",
	"Create.plainText": "Plain Text",
	"Create.createEncryptedShareLink": "Create Encrypted Share Link",
	"Create.createLinkIn": "Create Link In {seconds}s",
	"Create.startLiveRoomIn": "Start Live Room In {seconds}s",
	"Create.startLiveRoom": "Start Live Room",
	"Create.emailLinkAndKey": "Email Link And Key",
	"Create.copyLink": "Copy Link",
	"Create.copySessionKey": "Copy Session Key",
	"Create.copied": "Copied!",
	"Create.endLiveSync": "End Live Sync",
	"Create.replaceLinkWarning":
		"Creating another link replaces the active link and key shown here. Do not use older links or keys after generating a newer one; encrypted snapshot URLs that were already shared cannot be revoked without a backend revocation service.",
	"Create.pasteSessionKey": "Paste Session Key",
	"Create.importDraft": "Import Draft",
	"Create.importingDraft": "Importing Draft...",
	"NotFound.eyebrow": "404",
	"NotFound.title": "This route is not in the ledger.",
	"NotFound.body":
		"The page may have moved, or the current locale path does not have a matching TrustLedger route.",
	"NotFound.openDashboard": "Open Dashboard",
	"NotFound.readFaq": "Read FAQ",
	"NotFound.goHome": "Go Home",
};

function translateForTest(namespace: string | undefined, key: string, values?: unknown): string {
	const lookupKey = namespace === undefined ? key : `${namespace}.${key}`;
	const template = testMessages[lookupKey] ?? key;
	if (values === null || typeof values !== "object" || Array.isArray(values)) {
		return template;
	}
	return Object.entries(values as Record<string, string | number>).reduce(
		(text, [name, value]) => text.replaceAll(`{${name}}`, value.toString()),
		template,
	);
}

jest.mock("next-intl", () => ({
	useLocale: (): string => "en",
	useTranslations:
		(namespace?: string): ((key: string, values?: unknown) => string) =>
		(key, values) =>
			translateForTest(namespace, key, values),
}));

globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
globalThis.TextEncoder = TextEncoder;
if (typeof window !== "undefined") {
	installBrowserMocks();
}

jest.mock("@/i18n/navigation", () => {
	const Link = ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}): React.JSX.Element => {
		return React.createElement("a", { href, ...props }, children);
	};
	return { Link };
});
