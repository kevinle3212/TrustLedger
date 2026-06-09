type LegalDocumentSlug =
	| "terms"
	| "privacy"
	| "cookies"
	| "acceptable-use"
	| "content"
	| "dmca"
	| "trademark"
	| "risk"
	| "disclaimer"
	| "community"
	| "security";

export type LegalTranslationStatus = "source" | "machine-assisted" | "needs-review";

export type LegalDocument = {
	readonly slug: LegalDocumentSlug;
	readonly title: string;
	readonly sourceFile: string;
	readonly description: string;
	readonly translationStatus: LegalTranslationStatus;
};

export type LegalLocale = "en" | "es" | "vi" | "pt" | "zh-CN" | "ar" | "fr" | "hi";

const LEGAL_SOURCE_LOCALE = "en" satisfies LegalLocale;

const LEGAL_LOCALES = [
	"en",
	"es",
	"vi",
	"pt",
	"zh-CN",
	"ar",
	"fr",
	"hi",
] as const satisfies readonly LegalLocale[];

export const LEGAL_DOCUMENTS = [
	{
		slug: "terms",
		title: "Terms and Conditions",
		sourceFile: "TERMS_AND_CONDITIONS.md",
		description:
			"User obligations, platform scope, wallet activity, escrow actions, and dispute handling.",
		translationStatus: "source",
	},
	{
		slug: "privacy",
		title: "Privacy Policy",
		sourceFile: "PRIVACY_POLICY.md",
		description:
			"Personal data handling, wallet identifiers, operational logs, analytics, and user rights.",
		translationStatus: "source",
	},
	{
		slug: "cookies",
		title: "Cookie Policy",
		sourceFile: "COOKIE_POLICY.md",
		description: "Browser storage, cookies, analytics preferences, and consent expectations.",
		translationStatus: "source",
	},
	{
		slug: "acceptable-use",
		title: "Acceptable Use Policy",
		sourceFile: "ACCEPTABLE_USE_POLICY.md",
		description:
			"Prohibited activity, sanctions-sensitive conduct, abuse controls, and enforcement paths.",
		translationStatus: "source",
	},
	{
		slug: "content",
		title: "Content Policy",
		sourceFile: "CONTENT_POLICY.md",
		description:
			"Rules for contract links, deliverables, evidence uploads, and platform-visible materials.",
		translationStatus: "source",
	},
	{
		slug: "dmca",
		title: "DMCA Policy",
		sourceFile: "DMCA_POLICY.md",
		description:
			"Copyright takedown notices, counter-notices, repeat infringer handling, and agent details.",
		translationStatus: "source",
	},
	{
		slug: "trademark",
		title: "Trademark Policy",
		sourceFile: "TRADEMARK_POLICY.md",
		description: "Brand use, impersonation, confusing marks, and reporting requirements.",
		translationStatus: "source",
	},
	{
		slug: "risk",
		title: "Risk Disclosure",
		sourceFile: "RISK_DISCLOSURE.md",
		description:
			"Blockchain, wallet, smart contract, market, arbitration, and availability risks.",
		translationStatus: "source",
	},
	{
		slug: "disclaimer",
		title: "Disclaimer",
		sourceFile: "DISCLAIMER.md",
		description:
			"No legal, financial, tax, or investment advice and no guarantee of dispute outcomes.",
		translationStatus: "source",
	},
	{
		slug: "community",
		title: "Community Guidelines",
		sourceFile: "COMMUNITY_GUIDELINES.md",
		description:
			"Professional conduct, evidence quality, juror behavior, and communication standards.",
		translationStatus: "source",
	},
	{
		slug: "security",
		title: "Security Policy",
		sourceFile: "SECURITY.md",
		description:
			"Responsible disclosure, supported security scope, and vulnerability reporting.",
		translationStatus: "source",
	},
] as const satisfies readonly LegalDocument[];

function isLegalLocale(locale: string): locale is LegalLocale {
	return LEGAL_LOCALES.includes(locale as LegalLocale);
}

export function resolveLegalLocale(locale: string): LegalLocale {
	return isLegalLocale(locale) ? locale : LEGAL_SOURCE_LOCALE;
}

export function buildLegalTranslationPrompt(document: LegalDocument, locale: LegalLocale): string {
	return [
		`Translate ${document.sourceFile} from ${LEGAL_SOURCE_LOCALE} to ${locale}.`,
		"Preserve headings, lists, tables, defined terms, markdown links, and legal numbering.",
		"Do not invent legal obligations, jurisdictions, contact details, dates, or remedies.",
		"Flag ambiguous legal phrases for human review instead of silently changing meaning.",
	].join(" ");
}

export function getLegalTranslationStatus(locale: string): LegalTranslationStatus {
	return resolveLegalLocale(locale) === LEGAL_SOURCE_LOCALE ? "source" : "needs-review";
}
