import { render, screen } from "@testing-library/react";

import { NotFoundContent } from "@/components/NotFoundContent";

describe("NotFoundContent", () => {
	it("offers recovery actions for missing routes", () => {
		render(<NotFoundContent />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"This route is not in the ledger.",
		);
		expect(screen.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
			"href",
			"/dashboard",
		);
		expect(screen.getByRole("link", { name: "Read FAQ" })).toHaveAttribute("href", "/faq");
		expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
	});
});
