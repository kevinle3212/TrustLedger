import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
	base,
	injectedWallet,
	metaMaskWallet,
	walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { arbitrum, base as baseChain, optimism, sepolia } from "wagmi/chains";

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

export const config = getDefaultConfig({
	appName: "TrustLedger",
	projectId: hasWcProjectId ? wcProjectId : "YOUR_PROJECT_ID",
	wallets: [
		{
			groupName: "Popular",
			wallets: [
				// Only shown when a browser extension (e.g. MetaMask) is already injected.
				// Avoids the Safari "This page couldn't load" error caused by the metamask:// deep link
				// that fires when the extension is absent.
				injectedWallet,
				// Explicit MetaMask entry — shows a QR code fallback when the extension is missing,
				// which is the correct path for Safari + MetaMask Mobile.
				metaMaskWallet,
				// Universal QR-code connection; works in every browser including Safari.
				...(hasWcProjectId ? [walletConnectWallet] : []),
				base,
			],
		},
	],
	// Sepolia: testing and development only.
	// Arbitrum / Base / Optimism: production L2s with gas costs proportional to typical contract values.
	chains: [sepolia, arbitrum, baseChain, optimism],
	ssr: true,
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
