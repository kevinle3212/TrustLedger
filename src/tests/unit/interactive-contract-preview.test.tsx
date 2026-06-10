import { fireEvent, render, screen } from "@testing-library/react";

import { InteractiveContractPreview } from "@/app/[locale]/_components/InteractiveContractPreview";

const DEFAULT_PROPS = {
	title: "Escrow protection",
	amountLabel: "Amount",
	deadlineLabel: "Deadline",
	deadlineValue: "Friday",
	holdBackLabel: "Holdback",
	documentLabel: "Document",
	viewLabel: "View",
	statuses: {
		PENDING: "Pending",
		ACTIVE: "Active",
		APPROVED: "Approved",
	},
} as const;

describe("InteractiveContractPreview", () => {
	it("starts active and advances through the contract phases", () => {
		render(<InteractiveContractPreview {...DEFAULT_PROPS} />);

		expect(screen.getByText("0.75 ETH")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /02 Active/u })).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		fireEvent.click(screen.getByRole("button", { name: /Submit Work/u }));

		expect(screen.getByRole("button", { name: /03 Approved/u })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByText("Payout Receipt Ready!")).toBeInTheDocument();
	});

	it("allows direct phase selection", () => {
		render(<InteractiveContractPreview {...DEFAULT_PROPS} />);

		fireEvent.click(screen.getByRole("button", { name: /01 Pending/u }));

		expect(screen.getByRole("button", { name: /01 Pending/u })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByText("Draft Hash Queued!")).toBeInTheDocument();
	});

	it("restarts the document progress animation when a phase is selected", () => {
		const { container } = render(<InteractiveContractPreview {...DEFAULT_PROPS} />);
		const progressBefore = container.querySelector(".tl-contract-install-progress");

		fireEvent.click(screen.getByRole("button", { name: /01 Pending/u }));

		const progressAfter = container.querySelector(".tl-contract-install-progress");
		expect(progressBefore).not.toBe(progressAfter);
		expect(progressAfter).toBeInTheDocument();
	});
});
