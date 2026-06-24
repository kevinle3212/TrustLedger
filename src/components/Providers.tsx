"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
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
						<InactivityWatcher />
						{children}
					</QueryClientProvider>
				</WagmiProvider>
			</RoleProvider>
		</ThemeProvider>
	);
}
