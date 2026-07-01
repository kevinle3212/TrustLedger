import { render } from "@testing-library/react";
import type { ReactNode } from "react";

import { Providers } from "@/components/Providers";

/**
 * Regression guard for the wallet-restore ordering in `components/Providers.tsx`:
 * when this browser holds a persisted wallet session, AppKit must initialize on
 * mount (via the render-time `useStartAppKit` gate) so its connectors are
 * registered before any reconnect runs. If AppKit only initialized lazily on the
 * first wallet-modal open, a refresh would drop the connection. The complementary
 * case asserts first-time visitors (no session markers) never pay the heavy
 * AppKit init.
 *
 * Heavy provider dependencies are stubbed to passthroughs so the test exercises
 * only the init gate and not the real Wagmi/AppKit/React Query stack. The gate
 * latches AppKit init at most once per page load, so the no-session case must run
 * before the persisted-session case (it never trips the latch).
 */

const ensureAppKit = jest.fn();
const wagmiProviderProps = jest.fn();

jest.mock("@/lib/appkit", () => ({
	ensureAppKit: (): void => {
		ensureAppKit();
	},
}));

jest.mock("@/lib/wagmi", () => ({ config: {}, isE2eMockWallet: false }));

jest.mock("wagmi", () => ({
	WagmiProvider: (props: { children: ReactNode; reconnectOnMount?: boolean }): ReactNode => {
		wagmiProviderProps({ reconnectOnMount: props.reconnectOnMount });
		return props.children;
	},
	useAccount: (): { isConnected: boolean } => ({ isConnected: false }),
	useConnect: (): { connect: jest.Mock; connectors: [] } => ({
		connect: jest.fn(),
		connectors: [],
	}),
}));

jest.mock("@tanstack/react-query", () => ({
	QueryClient: jest.fn(),
	QueryClientProvider: ({ children }: { children: ReactNode }): ReactNode => children,
}));

jest.mock("next-themes", () => ({
	ThemeProvider: ({ children }: { children: ReactNode }): ReactNode => children,
}));

jest.mock("@/contexts/RoleContext", () => ({
	RoleProvider: ({ children }: { children: ReactNode }): ReactNode => children,
}));

jest.mock("@/lib/useInactivityLogout", () => ({ useInactivityLogout: (): void => undefined }));

jest.mock("@/lib/accountPreferences", () => ({
	DEFAULT_INACTIVITY_TIMEOUT_MS: 600000,
	readInactivityTimeoutMs: (): number => 600000,
	subscribeInactivityTimeout: (): (() => void) => (): void => undefined,
}));

async function renderProviders(): Promise<void> {
	render(<Providers>{null}</Providers>);
	// Let the gated dynamic import("@/lib/appkit") settle.
	await Promise.resolve();
	await Promise.resolve();
}

describe("Providers AppKit init gate", () => {
	beforeEach(() => {
		ensureAppKit.mockClear();
		wagmiProviderProps.mockClear();
		window.localStorage.clear();
	});

	it("enables wagmi reconnectOnMount so sessions restore on a full reload", async () => {
		await renderProviders();

		// wagmi's native reconnect is the primary restore path across refresh,
		// direct URL entry, and back/forward. Regression guard: it must stay on, or
		// restoration falls back to AppKit's lazy init alone and users get logged out.
		expect(wagmiProviderProps).toHaveBeenCalledWith({ reconnectOnMount: true });
	});

	it("does not initialize AppKit for a first-time visitor with no session", async () => {
		await renderProviders();

		expect(ensureAppKit).not.toHaveBeenCalled();
	});

	it("initializes AppKit on mount when a persisted session exists", async () => {
		window.localStorage.setItem("@appkit/connection_status", "connected");

		await renderProviders();

		expect(ensureAppKit).toHaveBeenCalledTimes(1);
	});
});
