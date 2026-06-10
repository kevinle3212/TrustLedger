"use client";

import { createAppKit, type CreateAppKit } from "@reown/appkit/react";
import {
	ACCENT_COLOR,
	APPKIT_FONT_FAMILY,
	FEATURED_WALLET_IDS,
	appUrl,
	networks,
	projectId,
	wagmiAdapter,
} from "@/lib/wagmi";

let appKitReady = false;

/**
 * AppKit is heavy enough that creating it during the global shell can make
 * slower devices feel stuck. Initialize it only when the wallet UI is requested.
 */
export function ensureAppKit(): void {
	if (appKitReady) return;
	createAppKit({
		// AppKit types an adapter's `namespace` as optional, but the adapters array
		// requires it; under `exactOptionalPropertyTypes` that surfaces as a mismatch.
		adapters: [wagmiAdapter] as NonNullable<CreateAppKit["adapters"]>,
		networks,
		projectId,
		metadata: {
			name: "TrustLedger",
			description:
				"Decentralized freelance escrow with on-chain reputation and juror arbitration.",
			url: appUrl,
			icons: [`${appUrl}/logo.png`],
		},
		featuredWalletIds: FEATURED_WALLET_IDS,
		themeMode: "dark",
		themeVariables: {
			"--w3m-accent": ACCENT_COLOR,
			"--w3m-font-family": APPKIT_FONT_FAMILY,
		},
		features: {
			analytics: false,
			email: false,
			socials: false,
		},
	});
	appKitReady = true;
}
