import { fireEvent, render, screen } from "@testing-library/react";

import { InteractiveContractPreview } from "@/app/[locale]/_components/InteractiveContractPreview";

const TRANSLATIONS: Record<string, string> = {
	"previewScenes.contract.label": "Contract View",
	"previewScenes.contract.title": "Escrow Protection",
	"previewScenes.contract.note": "Encrypted Draft Ready",
	"previewScenes.contract.kicker": "Freelancer Milestone",
	"previewScenes.juror.label": "Juror Staking",
	"previewScenes.juror.title": "Juror Dispute Flow",
	"previewScenes.juror.note": "3 Jurors Eligible",
	"previewScenes.juror.kicker": "Commit-Reveal arbitration",
	"previewScenes.reputation.label": "Reputation",
	"previewScenes.reputation.title": "On-Chain Reputation",
	"previewScenes.reputation.note": "92 Average Score",
	"previewScenes.reputation.kicker": "History from completed work",
	"exampleContractProgress": "Example contract progress",
	"nextPreview": "Next Preview",
	"previousPreview": "Previous Preview",
	"previewDraftHashQueued": "Draft Hash Queued!",
	"previewDocumentEncrypted": "Document Encrypted!",
	"previewFundEscrow": "Fund Escrow",
	"previewJurorStake": "0.04 ETH Staked",
	"previewMajorityVote": "Majority Vote",
	"previewPayoutReceiptReady": "Payout Receipt Ready!",
	"previewRatingsReceived": "12 Ratings Received",
	"previewRecoveryBonus": "+8 Recovery Bonus",
	"previewReleasePayout": "Release Payout",
	"previewRevealWindowOpen": "Reveal Window Open",
	"previewSubmitWork": "Submit Work",
	"verified": "Verified",
};

jest.mock("next-intl", () => ({
	useTranslations: jest.fn(
		(): ((key: string) => string) => (key: string) => TRANSLATIONS[key] ?? key,
	),
}));

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
