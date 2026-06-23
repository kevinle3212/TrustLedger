import { act, fireEvent, render, screen } from "@testing-library/react";

import { ConnectButton } from "@/components/ConnectButton";

const mockUseAccount = jest.fn();
const writeTextMock = jest.fn<Promise<void>, [string]>();

jest.mock("wagmi", () => ({
	useAccount: (): unknown => mockUseAccount(),
}));

jest.mock("next-intl", () => ({
	useTranslations:
		(): ((key: string, values?: Record<string, string>) => string) =>
		(key: string, values?: Record<string, string>): string => {
			const messages: Record<string, string> = {
				connectedAs: `Connected as ${values?.["address"] ?? ""}. Click to open wallet options.`,
				addressCopied: "Address copied",
				copyWalletAddress: "Copy wallet address",
				copied: "Copied!",
				copyAddress: "Copy address",
				walletMenu: "Wallet Menu",
				dashboard: "Dashboard",
				analytics: "Analytics",
				createContract: "Create Contract",
				reputation: "Reputation",
				account: "Account",
				status: "Status",
				about: "About",
				manageWallet: "Manage Wallet",
				walletMenuHint:
					"Open wallet-safe account tools, analytics, public status, and project background.",
				connectWallet: "Connect Wallet",
				openingWallet: "Opening Wallet",
			};
			return messages[key] ?? key;
		},
}));

describe("ConnectButton", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockUseAccount.mockReturnValue({
			address: "0x2222222222222222222222222222222222222222",
			isConnected: true,
			connector: { name: "Base" },
		});
		writeTextMock.mockResolvedValue(undefined);
		Object.assign(navigator, {
			clipboard: {
				writeText: writeTextMock,
			},
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("opens the connected address menu without loading the wallet modal", async () => {
		render(<ConnectButton compact />);

		const addressButton = screen.getByRole("button", {
			name: /connected as 0x2222222222222222222222222222222222222222/i,
		});
		const menu = screen.getByRole("menu", { name: "Wallet Menu" });

		expect(addressButton).toHaveAttribute("aria-expanded", "false");
		expect(menu).toHaveClass("opacity-0");

		fireEvent.click(addressButton);

		expect(addressButton).toHaveAttribute("aria-expanded", "true");
		expect(menu).toHaveClass("opacity-100");
		expect(screen.getByRole("menuitem", { name: /account/i })).toHaveAttribute(
			"href",
			"/account",
		);

		fireEvent.click(screen.getByRole("button", { name: "Copy wallet address" }));

		expect(writeTextMock).toHaveBeenCalledWith("0x2222222222222222222222222222222222222222");
		expect(await screen.findByRole("button", { name: "Address copied" })).toBeInTheDocument();

		act(() => {
			jest.advanceTimersByTime(1500);
		});

		expect(screen.getByRole("button", { name: "Copy wallet address" })).toBeInTheDocument();
	});

	it("renders the menu in a body portal with fixed positioning so navbar overflow cannot clip it", () => {
		render(<ConnectButton compact />);

		const menu = screen.getByRole("menu", { name: "Wallet Menu" });

		// createPortal mounts the menu as a direct child of document.body, escaping
		// the navbar's overflow-x-auto scroll container.
		expect(menu.parentElement).toBe(document.body);
		expect(menu.style.position).toBe("fixed");
	});
});
