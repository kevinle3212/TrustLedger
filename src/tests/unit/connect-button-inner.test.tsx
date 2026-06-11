import { act, fireEvent, render, screen } from "@testing-library/react";

import { ConnectButtonInner } from "@/components/ConnectButtonInner";

const openMock = jest.fn();
const writeTextMock = jest.fn<Promise<void>, [string]>();

jest.mock("@/lib/appkit", () => ({
	ensureAppKit: jest.fn(),
}));

jest.mock("@/lib/wagmi", () => ({
	APPKIT_FONT_FAMILY: "Inter, sans-serif",
}));

jest.mock("@reown/appkit/react", () => ({
	useAppKit: (): { open: typeof openMock } => ({ open: openMock }),
	useAppKitTheme: (): {
		setThemeMode: jest.Mock;
		setThemeVariables: jest.Mock;
	} => ({
		setThemeMode: jest.fn(),
		setThemeVariables: jest.fn(),
	}),
}));

jest.mock("next-themes", () => ({
	useTheme: (): { resolvedTheme: string } => ({ resolvedTheme: "light" }),
}));

jest.mock("wagmi", () => ({
	useAccount: (): {
		address: `0x${string}`;
		isConnected: boolean;
		connector: { name: string };
	} => ({
		address: "0x1111111111111111111111111111111111111111",
		isConnected: true,
		connector: { name: "MetaMask" },
	}),
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
			};
			return messages[key] ?? key;
		},
}));

describe("ConnectButtonInner", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		openMock.mockClear();
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

	it("opens a connected wallet navigation menu and keeps wallet management separate", () => {
		render(<ConnectButtonInner />);

		const addressButton = screen.getByRole("button", {
			name: /connected as 0x1111111111111111111111111111111111111111/i,
		});
		const menu = screen.getByRole("menu", { name: "Wallet Menu" });

		expect(addressButton).toHaveAttribute("aria-expanded", "false");
		expect(menu).toHaveClass("opacity-0");

		fireEvent.click(addressButton);

		expect(addressButton).toHaveAttribute("aria-expanded", "true");
		expect(menu).toHaveClass("opacity-100");
		expect(screen.getByRole("menuitem", { name: /analytics/i })).toHaveAttribute(
			"href",
			"/analytics",
		);
		expect(screen.getByRole("menuitem", { name: /dashboard/i })).toHaveAttribute(
			"href",
			"/dashboard",
		);
		expect(openMock).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("menuitem", { name: /manage wallet/i }));

		expect(openMock).toHaveBeenCalledTimes(1);
	});

	it("opens on hover and keeps the copy address button available", async () => {
		render(<ConnectButtonInner />);

		const addressButton = screen.getByRole("button", {
			name: /connected as 0x1111111111111111111111111111111111111111/i,
		});
		const copyButton = screen.getByRole("button", { name: "Copy wallet address" });
		const menu = screen.getByRole("menu", { name: "Wallet Menu" });

		fireEvent.pointerEnter(addressButton);
		expect(menu).toHaveClass("opacity-100");

		fireEvent.click(copyButton);

		expect(writeTextMock).toHaveBeenCalledWith("0x1111111111111111111111111111111111111111");
		expect(await screen.findByRole("button", { name: "Address copied" })).toBeInTheDocument();

		act(() => {
			jest.advanceTimersByTime(1500);
		});
		expect(screen.getByRole("button", { name: "Copy wallet address" })).toBeInTheDocument();
	});
});
