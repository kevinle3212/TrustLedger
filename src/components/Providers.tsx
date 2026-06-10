"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import { useInactivityLogout } from "@/lib/useInactivityLogout";
import { RoleProvider } from "@/contexts/RoleContext";

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
						<InactivityWatcher />
						{children}
					</QueryClientProvider>
				</WagmiProvider>
			</RoleProvider>
		</ThemeProvider>
	);
}
