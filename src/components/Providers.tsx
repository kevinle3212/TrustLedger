"use client";

import { useAppKitTheme } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { RoleProvider } from "@/contexts/RoleContext";

/**
 * Keeps the AppKit modal's light/dark mode in sync with next-themes.
 *
 * AppKit is a singleton (created in `@/lib/wagmi`), so this renders nothing and
 * only pushes the resolved theme into AppKit whenever it changes.
 */
function AppKitThemeSync(): null {
	const { resolvedTheme } = useTheme();
	const { setThemeMode } = useAppKitTheme();

	useEffect(() => {
		setThemeMode(resolvedTheme === "light" ? "light" : "dark");
	}, [resolvedTheme, setThemeMode]);

	return null;
}

/**
 * Drives the app-wide inactivity auto-logout. Renders nothing; lives inside
 * `<WagmiProvider>` so the wagmi hooks it relies on are available.
 */
function InactivityWatcher(): null {
	useInactivityLogout();
	return null;
}

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
						<AppKitThemeSync />
						<InactivityWatcher />
						{children}
					</QueryClientProvider>
				</WagmiProvider>
			</RoleProvider>
		</ThemeProvider>
	);
}
