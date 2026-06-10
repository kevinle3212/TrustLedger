type SolanaCluster = "devnet" | "testnet" | "mainnet-beta" | "localnet";

type SolanaSupportMode = "native-program" | "bridged-sol";

export type SolanaNetworkConfig = {
	readonly cluster: SolanaCluster;
	readonly label: string;
	readonly rpcUrl: string;
	readonly explorerBaseUrl: string;
};

const BASE58_ALPHABET = /^[1-9A-HJ-NP-Za-km-z]+$/u;

export const SOLANA_SUPPORT_MODE = "native-program" satisfies SolanaSupportMode;

export function getSolanaSupportLabel(mode: SolanaSupportMode = SOLANA_SUPPORT_MODE): string {
	return mode === "native-program" ? "Native-Program" : "Bridged SOL";
}

export const SOLANA_NETWORKS = {
	"devnet": {
		cluster: "devnet",
		label: "Solana Devnet",
		rpcUrl: "https://api.devnet.solana.com",
		explorerBaseUrl: "https://explorer.solana.com",
	},
	"testnet": {
		cluster: "testnet",
		label: "Solana Testnet",
		rpcUrl: "https://api.testnet.solana.com",
		explorerBaseUrl: "https://explorer.solana.com",
	},
	"mainnet-beta": {
		cluster: "mainnet-beta",
		label: "Solana Mainnet Beta",
		rpcUrl: "https://api.mainnet-beta.solana.com",
		explorerBaseUrl: "https://explorer.solana.com",
	},
	"localnet": {
		cluster: "localnet",
		label: "Solana Local Validator",
		rpcUrl: "http://127.0.0.1:8899",
		explorerBaseUrl: "https://explorer.solana.com",
	},
} as const satisfies Record<SolanaCluster, SolanaNetworkConfig>;

export function isSolanaCluster(value: string): value is SolanaCluster {
	return Object.hasOwn(SOLANA_NETWORKS, value);
}

export function resolveSolanaCluster(value: string | undefined): SolanaCluster {
	if (value !== undefined && isSolanaCluster(value)) {
		return value;
	}
	return "devnet";
}

export function getSolanaNetworkConfig(cluster: string | undefined): SolanaNetworkConfig {
	return SOLANA_NETWORKS[resolveSolanaCluster(cluster)];
}

export function isLikelySolanaAddress(value: string): boolean {
	const trimmed = value.trim();
	return trimmed.length >= 32 && trimmed.length <= 44 && BASE58_ALPHABET.test(trimmed);
}

export function getSolanaExplorerAddressUrl(address: string, cluster: SolanaCluster): string {
	const encodedAddress = encodeURIComponent(address.trim());
	const clusterParam = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
	return `${SOLANA_NETWORKS[cluster].explorerBaseUrl}/address/${encodedAddress}${clusterParam}`;
}
