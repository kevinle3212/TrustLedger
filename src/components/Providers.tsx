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

// Guards the gated AppKit init so it kicks off at most once per page load even
// though the lazy initializer below runs on the first render of every mounted
// `Providers` (and twice under React StrictMode in development).
let appKitInitStarted = false;

/**
 * Starts Reown AppKit initialization at the earliest client opportunity when a
 * wallet session exists to restore. AppKit owns the reconnection that restores a
 * connected account across reloads and direct navigations (its
 * `syncExistingConnection` routine); when AppKit is only created on demand (the
 * first time the wallet modal opens), a refresh drops the connection because
 * that reconnect logic never runs.
 *
 * Why render-time and not a `useEffect`: effects fire after the whole tree
 * commits, child-first, so an effect here would run *after* `<WagmiProvider>`
 * has already mounted. Kicking the (cached) dynamic import during the first
 * render starts the AppKit chunk fetch as early as possible, shrinking the
 * disconnected→connected window. `reconnectOnMount` is disabled on the provider
 * (see below) so wagmi never settles to "disconnected" before AppKit restores.
 *
 * The gate keeps first-time visitors — and clean-profile tooling such as
 * Lighthouse — from paying the heavy AppKit init and the WalletConnect
 * network/console activity it triggers, while returning users get their session
 * restored. It fires when our reconnect-hint label ({@link getLastWallet}) OR
 * any of AppKit's/wagmi's persisted session markers
 * ({@link hasPersistedWalletSession}) are present. The module is imported
 * dynamically so AppKit stays in a lazy chunk off the initial critical path. A
 * no-op during SSR (the gate reads `window`) and under the E2E mock build, which
 * bypasses AppKit entirely.
 */
function useStartAppKit(): void {
	useState(() => {
		if (appKitInitStarted || isE2eMockWallet) return null;
		if (getLastWallet() === null && !hasPersistedWalletSession()) return null;
		appKitInitStarted = true;
		void import("@/lib/appkit").then((mod) => {
			mod.ensureAppKit();
		});
		return null;
	});
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

	// Start AppKit before <WagmiProvider> mounts so its connectors are registered
	// in time for AppKit's own session restore (no-op under the E2E mock build).
	useStartAppKit();

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="light"
			enableSystem
			disableTransitionOnChange
		>
			<RoleProvider>
				{/*
				 * reconnectOnMount is disabled for the real wallet path: AppKit (not
				 * wagmi) owns session restoration via `syncExistingConnection`. Leaving
				 * it on lets wagmi attempt a reconnect before AppKit has registered its
				 * connectors, settling state to "disconnected" and causing a logged-out
				 * flash — or a stuck logged-out state — on refresh and direct
				 * navigation. The E2E mock path keeps it on so the mock connector
				 * rehydrates across navigations in tests.
				 */}
				<WagmiProvider config={config} reconnectOnMount={isE2eMockWallet}>
					<QueryClientProvider client={queryClient}>
						{isE2eMockWallet ? <E2eMockWalletAutoConnect /> : null}
						<InactivityWatcher />
						{children}
					</QueryClientProvider>
				</WagmiProvider>
			</RoleProvider>
		</ThemeProvider>
	);
}
