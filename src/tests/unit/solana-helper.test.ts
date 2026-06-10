import {
	getSolanaExplorerAddressUrl,
	getSolanaExplorerTxUrl,
	getSolanaNetworkConfig,
	isLikelySolanaAddress,
	resolveSolanaCluster,
} from "@/helpers/solana";

describe("solana helper", () => {
	it("defaults to devnet for unknown clusters", () => {
		expect(resolveSolanaCluster(undefined)).toBe("devnet");
		expect(resolveSolanaCluster("invalid")).toBe("devnet");
		expect(getSolanaNetworkConfig("invalid").rpcUrl).toBe("https://api.devnet.solana.com");
	});

	it("validates likely public key strings without accepting ambiguous characters", () => {
		expect(isLikelySolanaAddress("11111111111111111111111111111111")).toBe(true);
		expect(isLikelySolanaAddress("0OIl11111111111111111111111111111111")).toBe(false);
		expect(isLikelySolanaAddress("short")).toBe(false);
	});

	it("builds explorer URLs with cluster query parameters only when needed", () => {
		const address = "11111111111111111111111111111111";

		expect(getSolanaExplorerAddressUrl(address, "devnet")).toBe(
			"https://explorer.solana.com/address/11111111111111111111111111111111?cluster=devnet",
		);
		expect(getSolanaExplorerAddressUrl(address, "mainnet-beta")).toBe(
			"https://explorer.solana.com/address/11111111111111111111111111111111",
		);
		expect(getSolanaExplorerTxUrl(address, "testnet")).toBe(
			"https://explorer.solana.com/tx/11111111111111111111111111111111?cluster=testnet",
		);
	});
});
