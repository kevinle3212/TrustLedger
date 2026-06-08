import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrum, type AppKitNetwork, base, optimism, sepolia } from "@reown/appkit/networks";
import { createAppKit, type CreateAppKit } from "@reown/appkit/react";
import { FEATURED_WALLET_IDS } from "./walletIds";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface ContractDeployment {
	trustLedger: `0x${string}`;
	arbitration: `0x${string}`;
	jurorRegistry: `0x${string}`;
	reputationRegistry: `0x${string}`;
	deployBlock: bigint | undefined;
}

const CHAIN_NAMES: Record<number, string> = {
	10: "Optimism",
	8453: "Base",
	42161: "Arbitrum",
	11155111: "Sepolia",
	31337: "local Hardhat",
};

const PUBLIC_ENV = {
	NEXT_PUBLIC_TRUSTLEDGER_ADDRESS: process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS,
	NEXT_PUBLIC_ARBITRATION_ADDRESS: process.env.NEXT_PUBLIC_ARBITRATION_ADDRESS,
	NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS,
	NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS,
	NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK: process.env.NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK,
	NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA,
	NEXT_PUBLIC_ARBITRATION_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_ARBITRATION_ADDRESS_SEPOLIA,
	NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_SEPOLIA:
		process.env.NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_SEPOLIA,
	NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_SEPOLIA:
		process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_SEPOLIA,
	NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_SEPOLIA:
		process.env.NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_SEPOLIA,
	NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_ARBITRUM: process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_ARBITRUM,
	NEXT_PUBLIC_ARBITRATION_ADDRESS_ARBITRUM: process.env.NEXT_PUBLIC_ARBITRATION_ADDRESS_ARBITRUM,
	NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_ARBITRUM:
		process.env.NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_ARBITRUM,
	NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_ARBITRUM:
		process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_ARBITRUM,
	NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_ARBITRUM:
		process.env.NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_ARBITRUM,
	NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_BASE: process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_BASE,
	NEXT_PUBLIC_ARBITRATION_ADDRESS_BASE: process.env.NEXT_PUBLIC_ARBITRATION_ADDRESS_BASE,
	NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_BASE: process.env.NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_BASE,
	NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_BASE:
		process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_BASE,
	NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_BASE:
		process.env.NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_BASE,
	NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_OPTIMISM: process.env.NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_OPTIMISM,
	NEXT_PUBLIC_ARBITRATION_ADDRESS_OPTIMISM: process.env.NEXT_PUBLIC_ARBITRATION_ADDRESS_OPTIMISM,
	NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_OPTIMISM:
		process.env.NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_OPTIMISM,
	NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_OPTIMISM:
		process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_OPTIMISM,
	NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_OPTIMISM:
		process.env.NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_OPTIMISM,
	NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA: process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA,
	NEXT_PUBLIC_USDC_ADDRESS_ARBITRUM: process.env.NEXT_PUBLIC_USDC_ADDRESS_ARBITRUM,
	NEXT_PUBLIC_USDC_ADDRESS_BASE: process.env.NEXT_PUBLIC_USDC_ADDRESS_BASE,
	NEXT_PUBLIC_USDC_ADDRESS_OPTIMISM: process.env.NEXT_PUBLIC_USDC_ADDRESS_OPTIMISM,
	NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
	NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
	NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

type PublicEnvKey = keyof typeof PUBLIC_ENV;

function readAddress(key: PublicEnvKey): `0x${string}` | undefined {
	const value = PUBLIC_ENV[key];
	if (!/^0x[a-fA-F0-9]{40}$/.test(value ?? "")) return undefined;
	return value as `0x${string}`;
}

function readBlock(key: PublicEnvKey): bigint | undefined {
	const value = PUBLIC_ENV[key];
	if (value === undefined || value === "") return undefined;
	try {
		const parsed = BigInt(value);
		return parsed >= 0n ? parsed : undefined;
	} catch {
		return undefined;
	}
}

export const TRUSTLEDGER_ADDRESS: `0x${string}` =
	readAddress("NEXT_PUBLIC_TRUSTLEDGER_ADDRESS") ?? ZERO_ADDRESS;

export const ARBITRATION_ADDRESS: `0x${string}` =
	readAddress("NEXT_PUBLIC_ARBITRATION_ADDRESS") ?? ZERO_ADDRESS;

export const JUROR_REGISTRY_ADDRESS: `0x${string}` =
	readAddress("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS") ?? ZERO_ADDRESS;

export const REPUTATION_REGISTRY_ADDRESS: `0x${string}` =
	readAddress("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS") ?? ZERO_ADDRESS;

const DEFAULT_DEPLOYMENT: ContractDeployment = {
	trustLedger: TRUSTLEDGER_ADDRESS,
	arbitration: ARBITRATION_ADDRESS,
	jurorRegistry: JUROR_REGISTRY_ADDRESS,
	reputationRegistry: REPUTATION_REGISTRY_ADDRESS,
	deployBlock: readBlock("NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK"),
};

const CONTRACT_DEPLOYMENTS: Record<number, ContractDeployment> = {
	31337: DEFAULT_DEPLOYMENT,
	11155111: {
		trustLedger: readAddress("NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA") ?? TRUSTLEDGER_ADDRESS,
		arbitration: readAddress("NEXT_PUBLIC_ARBITRATION_ADDRESS_SEPOLIA") ?? ARBITRATION_ADDRESS,
		jurorRegistry:
			readAddress("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_SEPOLIA") ?? JUROR_REGISTRY_ADDRESS,
		reputationRegistry:
			readAddress("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_SEPOLIA") ??
			REPUTATION_REGISTRY_ADDRESS,
		deployBlock:
			readBlock("NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_SEPOLIA") ??
			DEFAULT_DEPLOYMENT.deployBlock,
	},
	42161: {
		trustLedger: readAddress("NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_ARBITRUM") ?? ZERO_ADDRESS,
		arbitration: readAddress("NEXT_PUBLIC_ARBITRATION_ADDRESS_ARBITRUM") ?? ZERO_ADDRESS,
		jurorRegistry: readAddress("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_ARBITRUM") ?? ZERO_ADDRESS,
		reputationRegistry:
			readAddress("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_ARBITRUM") ?? ZERO_ADDRESS,
		deployBlock: readBlock("NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_ARBITRUM"),
	},
	8453: {
		trustLedger: readAddress("NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_BASE") ?? ZERO_ADDRESS,
		arbitration: readAddress("NEXT_PUBLIC_ARBITRATION_ADDRESS_BASE") ?? ZERO_ADDRESS,
		jurorRegistry: readAddress("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_BASE") ?? ZERO_ADDRESS,
		reputationRegistry:
			readAddress("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_BASE") ?? ZERO_ADDRESS,
		deployBlock: readBlock("NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_BASE"),
	},
	10: {
		trustLedger: readAddress("NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_OPTIMISM") ?? ZERO_ADDRESS,
		arbitration: readAddress("NEXT_PUBLIC_ARBITRATION_ADDRESS_OPTIMISM") ?? ZERO_ADDRESS,
		jurorRegistry: readAddress("NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_OPTIMISM") ?? ZERO_ADDRESS,
		reputationRegistry:
			readAddress("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_OPTIMISM") ?? ZERO_ADDRESS,
		deployBlock: readBlock("NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_OPTIMISM"),
	},
};

export function getContractDeployment(chainId: number): ContractDeployment {
	return (
		CONTRACT_DEPLOYMENTS[chainId] ?? {
			...DEFAULT_DEPLOYMENT,
			trustLedger: ZERO_ADDRESS,
			arbitration: ZERO_ADDRESS,
			jurorRegistry: ZERO_ADDRESS,
			reputationRegistry: ZERO_ADDRESS,
		}
	);
}

export function getNetworkName(chainId: number): string {
	return CHAIN_NAMES[chainId] ?? `chain ${chainId.toString()}`;
}

export function getConfiguredDeploymentNetworkNames(): string[] {
	const configured = new Set<string>();
	for (const [chainId, deployment] of Object.entries(CONTRACT_DEPLOYMENTS)) {
		if (deployment.trustLedger !== ZERO_ADDRESS) {
			configured.add(getNetworkName(Number(chainId)));
		}
	}
	return [...configured];
}

// Native USDC addresses per supported chain. Sepolia uses Circle's testnet USDC.
// Override NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA for a custom mock deployment.
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
	11155111:
		(PUBLIC_ENV.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA as `0x${string}` | undefined) ??
		"0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle testnet USDC
	42161:
		(PUBLIC_ENV.NEXT_PUBLIC_USDC_ADDRESS_ARBITRUM as `0x${string}` | undefined) ??
		"0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // native USDC on Arbitrum One
	8453:
		(PUBLIC_ENV.NEXT_PUBLIC_USDC_ADDRESS_BASE as `0x${string}` | undefined) ??
		"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // native USDC on Base
	10:
		(PUBLIC_ENV.NEXT_PUBLIC_USDC_ADDRESS_OPTIMISM as `0x${string}` | undefined) ??
		"0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // native USDC on OP Mainnet
};

/** Returns true when `tokenAddress` is the USDC contract for `chainId`. */

/** Returns the USDC address for a chain, or undefined if not supported. */
export function getUsdcAddress(chainId: number): `0x${string}` | undefined {
	return USDC_ADDRESSES[chainId];
}

const wcProjectId = PUBLIC_ENV.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

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
const configuredAppUrl = PUBLIC_ENV.NEXT_PUBLIC_SITE_URL ?? PUBLIC_ENV.NEXT_PUBLIC_APP_URL;
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
createAppKit({
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
		"--w3m-font-family": "var(--font-geist-sans), Arial, Helvetica, sans-serif",
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
