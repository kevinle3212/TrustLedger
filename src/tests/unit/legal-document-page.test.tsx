import { render, screen } from "@testing-library/react";

import LegalDocumentPage from "@/app/[locale]/legal/[slug]/page";
import messages from "@/messages/en.json";

jest.mock("next-intl/server", () => ({
	getTranslations: jest.fn(async () => {
		await Promise.resolve();
		const legalMessages = messages.Legal as Record<string, unknown>;
		return (key: string): string => {
			const value = key.split(".").reduce<unknown>((current, part) => {
				if (typeof current !== "object" || current === null) return undefined;
				return (current as Record<string, unknown>)[part];
			}, legalMessages);
			return typeof value === "string" ? value : key;
		};
	}),
	setRequestLocale: jest.fn(),
}));

jest.mock("next/navigation", () => ({
	notFound: jest.fn(() => {
		throw new Error("not found");
	}),
}));

describe("LegalDocumentPage", () => {
	it("renders underscore emphasis as italic text", async () => {
		const page = await LegalDocumentPage({
			params: Promise.resolve({ locale: "en", slug: "community" }),
		});

		render(page);

		const reviewed = screen.getByText(
			/These Community Guidelines were last reviewed and updated/u,
		);

		expect(reviewed.tagName).toBe("EM");
	});
});
