import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrum, base, optimism, sepolia } from "wagmi/chains";

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

export const config = getDefaultConfig({
	appName: "TrustLedger",
	projectId: wcProjectId !== undefined && wcProjectId !== "" ? wcProjectId : "YOUR_PROJECT_ID",
	// Sepolia: testing and development only.
	// Arbitrum / Base / Optimism: production L2s with gas costs proportional to typical contract values.
	chains: [sepolia, arbitrum, base, optimism],
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
