import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrum, type AppKitNetwork, base, optimism, sepolia } from "@reown/appkit/networks";
import { createAppKit, type CreateAppKit } from "@reown/appkit/react";

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

// Sepolia: testing and development only.
// Arbitrum / Base / Optimism: production L2s with gas costs proportional to typical contract values.
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, arbitrum, base, optimism];

// Brand accent shared with the rest of the UI (indigo-500).
const ACCENT_COLOR = "#6366f1";

// Origin advertised to wallets during pairing. Falls back to the production URL
// during SSR/build where `window` is undefined.
const appUrl =
	process.env["NEXT_PUBLIC_SITE_URL"] ??
	(typeof window !== "undefined" ? window.location.origin : "https://trustledger.vercel.app");

// Verified WalletConnect Explorer IDs, surfaced first in the connect modal.
// These are the wallets we explicitly support; AppKit still lists every other
// registry wallet under "All Wallets".
const FEATURED_WALLET_IDS = [
	"d0ca99ff52b99abc48743dad0f7fc891e041be73574f7fac4afe5d4bb83845c8", // Coinbase Wallet
	"c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
	"a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393", // Phantom
	"21030f20fba1a77115858ee3a8bc5841c739ab4537441316e2f4b1d0a8d218af", // Tangem
	"fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // Base Account
];

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
