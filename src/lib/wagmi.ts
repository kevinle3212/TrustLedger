import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrum, type AppKitNetwork, base, optimism, sepolia } from "@reown/appkit/networks";
import { createAppKit, type CreateAppKit } from "@reown/appkit/react";
import { FEATURED_WALLET_IDS } from "./walletIds";

export const TRUSTLEDGER_ADDRESS: `0x${string}` =
	(process.env["NEXT_PUBLIC_TRUSTLEDGER_ADDRESS"] as `0x${string}` | undefined) ??
	"0x0000000000000000000000000000000000000000";

export const ARBITRATION_ADDRESS: `0x${string}` =
	(process.env["NEXT_PUBLIC_ARBITRATION_ADDRESS"] as `0x${string}` | undefined) ??
	"0x0000000000000000000000000000000000000000";

export const JUROR_REGISTRY_ADDRESS: `0x${string}` =
	(process.env["NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS"] as `0x${string}` | undefined) ??
	"0x0000000000000000000000000000000000000000";

export const REPUTATION_REGISTRY_ADDRESS: `0x${string}` =
	(process.env["NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS"] as `0x${string}` | undefined) ??
	"0x0000000000000000000000000000000000000000";

const wcProjectId = process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"];

const hasWcProjectId = wcProjectId !== undefined && wcProjectId !== "";

// Reown AppKit (and the WalletConnect relay it builds on) require a real project
// ID. The placeholder keeps the build and local dev working; set
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for the connect modal to actually pair.
const projectId = hasWcProjectId ? wcProjectId : "YOUR_PROJECT_ID";

// Relay-based wallets (Tangem, Phantom, MetaMask-mobile via QR, WalletConnect)
// silently fail to pair without a real project ID - especially on mobile, where
// there is no injected provider to fall back to. Warn loudly in the browser so
// the cause isn't a mystery during a mobile Tangem connect attempt.
if (!hasWcProjectId && typeof window !== "undefined") {
	console.warn(
		"[TrustLedger] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set - WalletConnect relay " +
			"wallets (Tangem, Phantom, mobile MetaMask) will not connect. Get a project ID at " +
			"https://dashboard.reown.com and set the env var.",
	);
}

// Sepolia: testing and development only.
// Arbitrum / Base / Optimism: production L2s with gas costs proportional to typical contract values.
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, arbitrum, base, optimism];

// Brand accent shared with the rest of the UI (indigo-500).
const ACCENT_COLOR = "#6366f1";

// Origin advertised to wallets during pairing. WalletConnect/AppKit requires
// this to match the actual page origin or mobile wallets (Tangem, etc.) reject
// the session. On the client we always use the real origin; during SSR/build we
// fall back to the configured site URL. NEXT_PUBLIC_SITE_URL is preferred;
// NEXT_PUBLIC_APP_URL is accepted as an alias so a single deployment URL var works.
const configuredAppUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? process.env["NEXT_PUBLIC_APP_URL"];
const appUrl =
	typeof window !== "undefined"
		? window.location.origin
		: (configuredAppUrl ?? "https://trustledger.vercel.app");

// The wagmi adapter builds the wagmi config AppKit drives. `ssr: true` mirrors
// the previous getDefaultConfig setup so Next.js server rendering stays correct.
const wagmiAdapter = new WagmiAdapter({
	networks,
	projectId,
	ssr: true,
});

/**
 * The wagmi config consumed by `<WagmiProvider>`. Built by the Reown AppKit
 * wagmi adapter rather than RainbowKit's getDefaultConfig, so the connect modal
 * can offer Coinbase Wallet (no longer deprecated), MetaMask, WalletConnect,
 * Phantom, Tangem, and every other WalletConnect-registry wallet.
 */
export const config = wagmiAdapter.wagmiConfig;

/**
 * The AppKit modal singleton. Created here (as an import side effect) so the
 * `<appkit-*>` web components register and the AppKit React hooks work anywhere
 * the wagmi config is imported. WalletConnect-relay wallets (MetaMask QR,
 * Phantom, Tangem, WalletConnect) need a real projectId; injected/Coinbase work
 * without the relay, which keeps desktop and iOS Safari connections reliable.
 */
export const appkit = createAppKit({
	// AppKit types an adapter's `namespace` as optional, but the adapters array
	// requires it; under `exactOptionalPropertyTypes` that surfaces as a mismatch.
	// The wagmi adapter is a valid ChainAdapter, so assert the expected element type.
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
	},
	features: {
		analytics: false,
		email: false,
		socials: false,
	},
});

const EXPLORERS: Record<number, string> = {
	11155111: "https://sepolia.etherscan.io", // Sepolia
	42161: "https://arbiscan.io", // Arbitrum One
	8453: "https://basescan.org", // Base
	10: "https://optimistic.etherscan.io", // OP Mainnet
};

export function getExplorerTxUrl(chainId: number, txHash: string): string {
	return `${EXPLORERS[chainId] ?? "https://sepolia.etherscan.io"}/tx/${txHash}`;
}
