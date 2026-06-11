import {
	buildLegalTranslationPrompt,
	getLegalDocumentBySlug,
	getLegalTranslationStatus,
	LEGAL_DOCUMENTS,
	resolveLegalLocale,
} from "@/helpers/legal-docs";

describe("legal docs helper", () => {
	it("falls back unsupported locales to English", () => {
		expect(resolveLegalLocale("de")).toBe("en");
		expect(getLegalTranslationStatus("de")).toBe("source");
	});

	it("marks supported non-source locales for human review", () => {
		expect(resolveLegalLocale("es")).toBe("es");
		expect(getLegalTranslationStatus("es")).toBe("needs-review");
	});

	it("builds a constrained translation prompt", () => {
		const prompt = buildLegalTranslationPrompt(LEGAL_DOCUMENTS[0], "fr");

		expect(prompt).toContain("TERMS_AND_CONDITIONS.md");
		expect(prompt).toContain("from English to French");
		expect(prompt).toContain("Preserve headings");
		expect(prompt).toContain("human review");
	});

	it("builds a review prompt for the English source locale", () => {
		const prompt = buildLegalTranslationPrompt(LEGAL_DOCUMENTS[0], "en");

		expect(prompt).toContain("Review TERMS_AND_CONDITIONS.md in English");
		expect(prompt).not.toContain("from en to en");
		expect(prompt).not.toContain("from English to en");
	});

	it("resolves registered legal document slugs", () => {
		expect(LEGAL_DOCUMENTS.map((document) => document.slug)).toContain("terms");
		expect(getLegalDocumentBySlug("terms")?.sourceFile).toBe("TERMS_AND_CONDITIONS.md");
		expect(getLegalDocumentBySlug("missing")).toBeUndefined();
	});
});
