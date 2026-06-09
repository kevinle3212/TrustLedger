import {
	buildLegalTranslationPrompt,
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
		expect(prompt).toContain("Preserve headings");
		expect(prompt).toContain("human review");
	});
});
