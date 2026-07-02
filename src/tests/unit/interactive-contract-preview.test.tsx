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
	"previewDemoPhases.pending": "Exploratory",
	"previewDemoPhases.active": "Simulated",
	"previewDemoPhases.approved": "Example State",
	"exampleContractProgress": "Example contract progress",
	"nextPreview": "Next Preview",
	"previousPreview": "Previous Preview",
	"previewFundEscrow": "Fund Escrow",
	"previewJurorStake": "0.04 ETH Staked",
	"previewMajorityVote": "Majority Vote",
	"previewRatingsReceived": "12 Ratings Received",
	"previewRecoveryBonus": "+8 Recovery Bonus",
	"previewReleasePayout": "Release Payout",
	"previewRevealWindowOpen": "Reveal Window Open",
	"previewSubmitWork": "Submit Work",
	"verified": "Verified",
	"unverified": "Unverified",
	"verificationTitle": "Verification",
	"verifyStageAnchored": "Draft hash anchored",
	"verifyStageFunded": "Escrow funded",
	"verifyStageApproved": "Deliverable approved",
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
} as const;

describe("InteractiveContractPreview", () => {
	const fill = (): HTMLElement => {
		const el = document.querySelector<HTMLElement>(".tl-verify-progress > div");
		if (el === null) throw new Error("verification fill bar not rendered");
		return el;
	};

	it("starts on pending, unverified at 0% verification progress", () => {
		render(<InteractiveContractPreview {...DEFAULT_PROPS} />);

		expect(screen.getByText("0.25 ETH")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /01 Exploratory/u })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByText("Unverified")).toBeInTheDocument();
		expect(fill()).toHaveStyle({ width: "0%" });
	});

	it("fills verification as phases complete and verifies only when approved", () => {
		render(<InteractiveContractPreview {...DEFAULT_PROPS} />);

		// Active clears two of three stages but is still Unverified.
		fireEvent.click(screen.getByRole("button", { name: /02 Simulated/u }));
		expect(fill()).toHaveStyle({ width: "67%" });
		expect(screen.getByText("Unverified")).toBeInTheDocument();

		// Approved clears the final stage and flips the badge to Verified.
		fireEvent.click(screen.getByRole("button", { name: /03 Example State/u }));
		expect(fill()).toHaveStyle({ width: "100%" });
		expect(screen.getByText("Verified")).toBeInTheDocument();
	});

	it("restarts the verification progress animation when a phase is selected", () => {
		render(<InteractiveContractPreview {...DEFAULT_PROPS} />);
		const before = fill();

		fireEvent.click(screen.getByRole("button", { name: /03 Example State/u }));

		const after = fill();
		expect(before).not.toBe(after);
		expect(after).toBeInTheDocument();
	});
});
