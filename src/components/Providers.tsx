"use client";

import { useAppKitTheme } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";

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

export function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			enableSystem={false}
			disableTransitionOnChange
		>
			<WagmiProvider config={config}>
				<QueryClientProvider client={queryClient}>
					<AppKitThemeSync />
					{children}
				</QueryClientProvider>
			</WagmiProvider>
		</ThemeProvider>
	);
}
