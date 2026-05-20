"use client";

import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const ACCENT = "#6366f1";

/** Reads resolved theme and passes matching RainbowKit theme down. */
function RainbowKitThemeWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
	const { resolvedTheme } = useTheme();
	const rkTheme =
		resolvedTheme === "light"
			? lightTheme({ accentColor: ACCENT })
			: darkTheme({ accentColor: ACCENT });
	return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
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
					<RainbowKitThemeWrapper>{children}</RainbowKitThemeWrapper>
				</QueryClientProvider>
			</WagmiProvider>
		</ThemeProvider>
	);
}
