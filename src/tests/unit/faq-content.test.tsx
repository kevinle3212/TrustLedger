import { render, screen } from "@testing-library/react";

import { FaqContent } from "@/components/FaqContent";

describe("FaqContent", () => {
	it("renders curated escrow, wallet, dispute, and faucet questions", () => {
		render(<FaqContent />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Read This Before You Move Money Or If You Have Any General Questions.",
		);
		expect(
			screen.getByText("What happens to funds after a contract is created?"),
		).toBeVisible();
		expect(screen.getByText("Why do I need Sepolia ETH?")).toBeVisible();
		expect(screen.getByText("How are disputes resolved?")).toBeVisible();
		expect(screen.getByRole("link", { name: "Create Contract" })).toHaveAttribute(
			"href",
			"/create",
		);
		expect(screen.getByRole("link", { name: "Sepolia Faucet Guide" })).toHaveAttribute(
			"href",
			expect.stringContaining("docs/FAUCETS.md"),
		);
	});
});
