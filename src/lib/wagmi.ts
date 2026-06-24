import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arbitrum, type AppKitNetwork, base, optimism, sepolia } from "@reown/appkit/networks";
import { createConfig, http } from "wagmi";
import { mock } from "wagmi/connectors";
import {
	arbitrum as arbitrumChain,
	base as baseChain,
	optimism as optimismChain,
	sepolia as sepoliaChain,
} from "viem/chains";
import { FEATURED_WALLET_IDS } from "./walletIds";

/** The all-zero EVM address used as a sentinel for "no token" (native ETH) in escrow contracts. */
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

/**
 * Returns the contract addresses for the given chain.
 * Falls back to zero-address placeholders when `chainId` has no configured deployment.
 */
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

/** Returns the human-readable network name for a chain ID, falling back to `"chain <id>"`. */
export function getNetworkName(chainId: number): string {
	return CHAIN_NAMES[chainId] ?? `chain ${chainId.toString()}`;
}

/** Returns the network names for all chains that have a non-zero `TrustLedger` contract address configured. */
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

// Reown AppKit (and the WalletConnect relay it builds on) require a real
// project ID during prerender because AppKit hooks read the singleton on SSR.
// This is a NEXT_PUBLIC value, not a secret; Docker/Kubernetes provide it
// through build/runtime config so builds do not fall back to placeholders.
export const projectId = wcProjectId ?? "";

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
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [sepolia, arbitrum, base, optimism];

// Brand accent shared with the rest of the UI (indigo-500).
export const ACCENT_COLOR = "#6366f1";
export const APPKIT_FONT_FAMILY =
	'var(--font-sans), ui-sans-serif, system-ui, -apple-system, blinkmacsystemfont, "Segoe UI", sans-serif';

// Origin advertised to wallets during pairing. WalletConnect/AppKit requires
// this to match the actual page origin or mobile wallets (Tangem, etc.) reject
// the session. On the client we always use the real origin; during SSR/build we
// fall back to the configured site URL. NEXT_PUBLIC_SITE_URL is preferred;
// NEXT_PUBLIC_APP_URL is accepted as an alias so a single deployment URL var works.
const configuredAppUrl = PUBLIC_ENV.NEXT_PUBLIC_SITE_URL ?? PUBLIC_ENV.NEXT_PUBLIC_APP_URL;
export const appUrl =
	typeof window !== "undefined"
		? window.location.origin
		: (configuredAppUrl ?? "https://trustledger.vercel.app");

// The wagmi adapter builds the wagmi config AppKit drives. `ssr: true` mirrors
// the previous getDefaultConfig setup so Next.js server rendering stays correct.
export const wagmiAdapter = new WagmiAdapter({
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
/**
 * Deterministic EOA used by the env-gated E2E mock wallet. Matches Anvil's
 * second default account so on-chain follow-up tests can reuse the same key.
 */
export const E2E_MOCK_ADDRESS: `0x${string}` = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

/**
 * True only when the build opts into the deterministic mock wallet via
 * `NEXT_PUBLIC_E2E_MOCK_WALLET=1`. Used by Playwright connected-flow specs so a
 * fake account is available without a real wallet. Never set in production.
 */
export const isE2eMockWallet = process.env.NEXT_PUBLIC_E2E_MOCK_WALLET === "1";

/**
 * Builds a standalone wagmi config backed by wagmi's `mock` connector. Bypasses
 * Reown AppKit entirely: the connector reports a connected account so the
 * connected UI (wallet menu, analytics shell, juror staking panel) renders.
 * Contract reads stay disabled (zero-address deployments), so no chain is hit.
 */
function createE2eMockConfig(): ReturnType<typeof createConfig> {
	return createConfig({
		chains: [sepoliaChain, arbitrumChain, baseChain, optimismChain],
		connectors: [mock({ accounts: [E2E_MOCK_ADDRESS], features: { reconnect: true } })],
		transports: {
			[sepoliaChain.id]: http(),
			[arbitrumChain.id]: http(),
			[baseChain.id]: http(),
			[optimismChain.id]: http(),
		},
		ssr: true,
	});
}

export const config = isE2eMockWallet ? createE2eMockConfig() : wagmiAdapter.wagmiConfig;
export { FEATURED_WALLET_IDS };

const EXPLORERS: Record<number, string> = {
	11155111: "https://sepolia.etherscan.io", // Sepolia
	42161: "https://arbiscan.io", // Arbitrum One
	8453: "https://basescan.org", // Base
	10: "https://optimistic.etherscan.io", // OP Mainnet
};

/**
 * Returns the block-explorer transaction URL for the given chain and transaction hash.
 * Falls back to Sepolia Etherscan when `chainId` has no configured explorer.
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
	return `${EXPLORERS[chainId] ?? "https://sepolia.etherscan.io"}/tx/${txHash}`;
}
