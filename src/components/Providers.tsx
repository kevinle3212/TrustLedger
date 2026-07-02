"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAccount, useConnect, useReconnect, WagmiProvider } from "wagmi";
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
 * Lighthouse — from paying the AppKit init and the WalletConnect network/console
 * activity it triggers, while returning users get their session restored. It
 * fires when our reconnect-hint label ({@link getLastWallet}) OR any of
 * AppKit's/wagmi's persisted session markers ({@link hasPersistedWalletSession})
 * are present.
 *
 * AppKit owns session restore: the Reown wagmi adapter builds its wagmi config
 * with an empty connector set and only registers connectors when AppKit
 * initializes (its `syncConnectors` routine, which also reconnects the persisted
 * account). So restoration across a full reload depends on `ensureAppKit()`
 * running on load for returning users — which this gate triggers.
 *
 * The module is imported dynamically so AppKit stays in a lazy chunk off the
 * initial critical path (first-time visitors and clean-profile tooling such as
 * Lighthouse never download it — a static import here bundles ~380 KiB of unused
 * AppKit JS into every page and tanks LCP). The gate fires the import as early
 * as possible (first render) so the chunk is already in flight before the user
 * can interact. A no-op during SSR (the gate reads `window`) and under the E2E
 * mock build, which bypasses AppKit entirely.
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

/** Minimal shape of an EIP-1193 injected provider we probe for a live session. */
interface Eip1193Provider {
	readonly request: (args: { method: string }) => Promise<unknown>;
}

/**
 * Client-side wallet session restore that covers every connector type, closing
 * the logout-on-refresh / direct-URL bug for injected *and* relay/SDK wallets
 * (MetaMask, Coinbase/Base, WalletConnect…), independent of when AppKit loads.
 *
 * Two complementary paths, both acting only from a settled `disconnected` state
 * (they bail the moment wagmi reports connecting/reconnecting/connected, so they
 * never fight wagmi's own `reconnectOnMount` or AppKit's restore):
 *
 * 1. Injected no-network probe. If `window.ethereum` still lists this origin as
 *    authorized (`eth_accounts` returns a non-empty list, which never prompts),
 *    connect the standalone injected connector from {@link config}. This path
 *    needs no AppKit chunk and no network, so injected wallets restore instantly.
 *
 * 2. Connector-aware reconnect. wagmi's `reconnectOnMount` fires exactly once, at
 *    mount — *before* AppKit registers its lazily-loaded connectors (the
 *    Coinbase/Base SDK and WalletConnect). At that instant those persisted
 *    sessions have no connector to reconnect to, so the single early attempt
 *    settles to `disconnected` and the user appears logged out. When AppKit
 *    finishes and the connector set grows, we re-run wagmi's `reconnect()` so
 *    those sessions restore too. `reconnect()` only reconnects connectors wagmi
 *    already recorded as previously connected, so it never prompts, and the
 *    {@link hasPersistedWalletSession} gate keeps first-time visitors from
 *    triggering it at all.
 *
 * Everything runs on the client after hydration, so static rendering and SSR
 * hydration are untouched.
 */
function WalletSessionRestore(): null {
	const { connect, connectors } = useConnect();
	const { reconnect } = useReconnect();
	const { status } = useAccount();
	const injectedAttempted = useRef(false);
	const lastConnectorCount = useRef(0);

	// Path 1: injected no-network probe (runs at most once).
	useEffect(() => {
		if (injectedAttempted.current) return;
		if (status !== "disconnected") return;

		const provider = (globalThis as { ethereum?: Eip1193Provider }).ethereum;
		if (provider === undefined) return;

		const injectedConnector = connectors.find(
			(c) => c.type === "injected" || c.id === "injected",
		);
		if (injectedConnector === undefined) return;

		injectedAttempted.current = true;
		void provider
			.request({ method: "eth_accounts" })
			.then((accounts) => {
				if (Array.isArray(accounts) && accounts.length > 0) {
					connect({ connector: injectedConnector });
				}
			})
			.catch(() => {
				// A failed silent probe just means no restorable session; ignore.
			});
	}, [status, connect, connectors]);

	// Path 2: re-run wagmi reconnect when AppKit grows the connector set, so
	// Coinbase/Base SDK and WalletConnect sessions restore after their connectors
	// register (later than wagmi's one-shot reconnectOnMount). Gated on a real
	// persisted session so first-time visitors never trigger a reconnect.
	useEffect(() => {
		if (status !== "disconnected") return;
		if (connectors.length <= lastConnectorCount.current) return;
		lastConnectorCount.current = connectors.length;
		if (!hasPersistedWalletSession()) return;
		reconnect();
	}, [status, connectors, reconnect]);

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
				 * reconnectOnMount is enabled on every path. It is wagmi's native,
				 * battle-tested session restore: on mount it reconnects from wagmi's
				 * own persisted connector state, synchronously in the store and with no
				 * dependency on the heavy AppKit chunk having loaded yet. This is what
				 * keeps injected wallets (MetaMask, Coinbase) signed in across a full
				 * reload, direct URL entry, and back/forward navigation. AppKit's gated
				 * eager init (see useStartAppKit) still runs so WalletConnect sessions —
				 * whose connector is only registered once AppKit's universal provider
				 * is set up — are restored too, and so the modal is ready. The brief
				 * `reconnecting` window (isConnected is momentarily false) is absorbed
				 * by the wallet buttons, which render a neutral busy state while
				 * restoring instead of the logged-out CTA, so there is no flash. Leaving
				 * this off previously made restoration hinge solely on AppKit's lazy
				 * `syncConnectors`, which left users stuck logged out whenever that
				 * async path did not complete.
				 */}
				<WagmiProvider config={config} reconnectOnMount>
					<QueryClientProvider client={queryClient}>
						{isE2eMockWallet ? (
							<E2eMockWalletAutoConnect />
						) : (
							<WalletSessionRestore />
						)}
						<InactivityWatcher />
						{children}
					</QueryClientProvider>
				</WagmiProvider>
			</RoleProvider>
		</ThemeProvider>
	);
}
