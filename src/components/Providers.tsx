"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, WagmiProvider } from "wagmi";
import { config, isE2eMockWallet } from "@/lib/wagmi";
import { getLastWallet, hasPersistedWalletSession } from "@/lib/lastWallet";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import {
	DEFAULT_INACTIVITY_TIMEOUT_MS,
	readInactivityTimeoutMs,
	subscribeInactivityTimeout,
} from "@/lib/accountPreferences";
import { RoleProvider } from "@/contexts/RoleContext";

/**
 * Drives the app-wide inactivity auto-logout. Renders nothing; lives inside
 * `<WagmiProvider>` so the wagmi hooks it relies on are available. Reads the
 * timeout from an external store so same-tab and cross-tab changes apply live.
 */
function InactivityWatcher(): null {
	const timeoutMs = useSyncExternalStore(
		subscribeInactivityTimeout,
		readInactivityTimeoutMs,
		() => DEFAULT_INACTIVITY_TIMEOUT_MS,
	);

	useInactivityLogout(timeoutMs);
	return null;
}

/**
 * Initializes Reown AppKit once on the client, after hydration, but only when a
 * wallet was previously used in this browser. AppKit owns the wallet-session
 * reconnection that restores a connected account across page reloads and direct
 * navigations; when it is only created on demand (the first time the wallet
 * modal opens), a refresh drops the connection because its reconnect logic never
 * runs.
 *
 * The gate keeps first-time visitors — and clean-profile tooling such as
 * Lighthouse — from paying the heavy AppKit init and the WalletConnect
 * network/console activity it triggers (which also tanks the best-practices
 * budget when no project ID is configured), while returning users still get
 * their session restored. It fires when EITHER our reconnect-hint label
 * ({@link getLastWallet}) OR wagmi's own persisted session
 * ({@link hasPersistedWalletSession}) is present: the wagmi signal is the
 * authoritative one, so a session is restored even if the optional label was
 * never written or was cleared. The module is imported dynamically so AppKit
 * stays in a lazy chunk off the initial critical path. Skipped under the E2E
 * mock build, which bypasses AppKit entirely.
 */
function AppKitInitializer(): null {
	useEffect(() => {
		if (getLastWallet() === null && !hasPersistedWalletSession()) return;
		void import("@/lib/appkit").then((mod) => {
			mod.ensureAppKit();
		});
	}, []);
	return null;
}

/**
 * Connects the deterministic mock wallet on mount when the E2E mock build is
 * active (`NEXT_PUBLIC_E2E_MOCK_WALLET=1`). Renders nothing and is never mounted
 * in production builds, where {@link isE2eMockWallet} is false.
 */
function E2eMockWalletAutoConnect(): null {
	const { connect, connectors } = useConnect();
	const { isConnected } = useAccount();

	useEffect(() => {
		if (isConnected) return;
		const mockConnector = connectors[0];
		if (mockConnector !== undefined) connect({ connector: mockConnector });
	}, [isConnected, connect, connectors]);

	return null;
}

/** Root client provider tree wrapping the app with Wagmi, AppKit, React Query, and other shared contexts. */
export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="light"
			enableSystem
			disableTransitionOnChange
		>
			<RoleProvider>
				<WagmiProvider config={config}>
					<QueryClientProvider client={queryClient}>
						{isE2eMockWallet ? <E2eMockWalletAutoConnect /> : <AppKitInitializer />}
						<InactivityWatcher />
						{children}
					</QueryClientProvider>
				</WagmiProvider>
			</RoleProvider>
		</ThemeProvider>
	);
}
