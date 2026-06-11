import { render, screen } from "@testing-library/react";

import { FaqContent } from "@/components/FaqContent";

const TRANSLATIONS: Record<string, string> = {
	"createContract": "Create Contract",
	"detailBody": "The developer docs cover deployment, faucets, tests, and contract behavior.",
	"detailTitle": "Need operational detail?",
	"eyebrow": "FAQ",
	"faucetGuide": "Sepolia Faucet Guide",
	"introAfter": "and ask anything there.",
	"introBefore":
		"Use this page when you are creating an escrow, debugging a wallet issue, or deciding what to do after a contract changes state. Start a discussion in",
	"items.five.answer":
		"Check that the connected wallet is the expected client, freelancer, or juror wallet; confirm the network; then read the simulation or wallet error before retrying.",
	"items.five.question": "What should I do when a transaction fails?",
	"items.four.answer":
		"Yes, supported ERC-20 escrows use token approval and funding instead of sending native ETH directly with the acceptance transaction.",
	"items.four.question": "Can I pay with USDC instead of ETH?",
	"items.one.answer":
		"No. The app guides you through wallet connection, escrow funding, work submission, approval, and disputes with plain-language labels.",
	"items.one.question": "Do I need crypto experience to use TrustLedger?",
	"items.seven.answer":
		"The reputation page shows average ratings and recovery status for a wallet when the ReputationRegistry is configured.",
	"items.seven.question": "Where can I check reputation?",
	"items.six.answer":
		"Staked jurors commit hidden votes, reveal them later, and the median completion percentage determines payout. Majority jurors can claim rewards.",
	"items.six.question": "How are disputes resolved?",
	"items.three.answer":
		"Sepolia ETH pays gas for development and testnet transactions. It has no real value, but faucets rate-limit it to prevent abuse.",
	"items.three.question": "Why do I need Sepolia ETH?",
	"items.two.answer":
		"Funds stay in the smart contract escrow. They release only after client approval, acceptance-window expiry, deadline recovery, or an arbitration ruling.",
	"items.two.question": "What happens to funds after a contract is created?",
	"title": "Read this before you move money or if you have general questions.",
};

jest.mock("next-intl", () => ({
	useTranslations: jest.fn(
		(): ((key: string) => string) => (key: string) => TRANSLATIONS[key] ?? key,
	),
}));

describe("FaqContent", () => {
	it("renders curated escrow, wallet, dispute, and faucet questions", () => {
		render(<FaqContent />);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Read this before you move money or if you have general questions.",
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
