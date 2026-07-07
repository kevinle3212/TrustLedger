import { render, screen } from "@testing-library/react";

import { isWalletRestoringStatus, WalletRestoringPage } from "@/components/WalletRequiredPage";

jest.mock("@/components/ConnectButton", () => ({
	ConnectButton: (): React.JSX.Element => <button type="button">Connect Wallet</button>,
}));

jest.mock("next-intl", () => ({
	useTranslations:
		(): ((key: string) => string) =>
		(key: string): string => {
			const messages: Record<string, string> = {
				openingWallet: "Opening Wallet",
			};
			return messages[key] ?? key;
		},
}));

describe("WalletRequiredPage restore state", () => {
	it("treats wagmi connection startup states as wallet restoration", () => {
		expect(isWalletRestoringStatus("connecting")).toBe(true);
		expect(isWalletRestoringStatus("reconnecting")).toBe(true);
		expect(isWalletRestoringStatus("connected")).toBe(false);
		expect(isWalletRestoringStatus("disconnected")).toBe(false);
	});

	it("shows a neutral busy state instead of a connect prompt while restoring", () => {
		render(<WalletRestoringPage />);

		const heading = screen.getByRole("heading", { name: "Opening Wallet" });

		expect(heading).toBeInTheDocument();
		expect(heading.closest("section")).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByRole("button", { name: "Connect Wallet" })).not.toBeInTheDocument();
	});
});
