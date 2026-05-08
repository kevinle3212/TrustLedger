// hardhat.config.ts — central configuration for the Hardhat development environment.
// Hardhat is a JavaScript/TypeScript toolkit for compiling, testing, and deploying
// Solidity smart contracts. Everything it does is driven by this file.

import type { HardhatUserConfig } from "hardhat/config";

// This plugin bundles together the most common Hardhat plugins:
//   hardhat-ethers  → ethers.js integration (contract factories, signers, providers)
//   hardhat-chai-matchers → extra Chai assertions for smart contracts (revertedWithCustomError, etc.)
//   hardhat-typechain → generates TypeScript type wrappers for each contract after compile
//   hardhat-gas-reporter, hardhat-coverage, etc.
import "@nomicfoundation/hardhat-toolbox";

// dotenv reads a .env file in the project root and loads its key=value pairs into
// process.env so we can access secrets (RPC URL, private key, API key) without
// hardcoding them.
import { config as conf } from "dotenv";
conf();

const config: HardhatUserConfig = {
	// ─── Solidity compiler settings ──────────────────────────────────────────────
	solidity: {
		version: "0.8.24", // must match the pragma in the .sol source files
		settings: {
			optimizer: {
				enabled: true, // shrinks bytecode and reduces gas cost for on-chain calls
				runs: 200, // how many times the contract is expected to be called over its lifetime;
				// higher = smaller per-call gas, larger deploy size
			},
		},
	},

	// ─── File layout ─────────────────────────────────────────────────────────────
	// Hardhat's defaults assume contracts/ is the source folder, but our project
	// uses a monorepo-style layout where Foundry lives under contracts/ too.
	// These overrides tell Hardhat where to look.
	paths: {
		sources: "./contracts/src", // Solidity source files (.sol)
		tests: "./test", // Hardhat/Mocha test files (.ts)
		cache: "./hardhat-cache", // compiled artifact cache (ignored by git)
		artifacts: "./artifacts", // compiled ABI + bytecode output (ignored by git)
	},

	// ─── Networks ─────────────────────────────────────────────────────────────────
	// Each entry defines an EVM network Hardhat can connect to.
	networks: {
		// The built-in ephemeral network: spins up a local chain in memory for each
		// test run, giving every test a clean slate with no persistent state.
		hardhat: {
			chainId: 31337, // standard local chain ID; tools like MetaMask recognise it
		},

		// Arbitrum Sepolia is the Layer-2 testnet we deploy to for real testing.
		// Values are read from .env so private keys never touch source control.
		arbitrumSepolia: {
			url: process.env.ARBITRUM_SEPOLIA_RPC_URL ?? "", // node endpoint (e.g. Alchemy/Infura)
			accounts:
				typeof process.env.DEPLOYER_PRIVATE_KEY === "string" // wallet that signs transactions
					? [process.env.DEPLOYER_PRIVATE_KEY]
					: [], // empty → can't deploy (safe default)
			chainId: 421614, // Arbitrum Sepolia's official chain ID
		},
	},

	// ─── Mocha test runner settings ───────────────────────────────────────────────
	// Mocha is the test framework Hardhat uses to run .test.ts files.
	mocha: {
		timeout: 120000, // milliseconds per test before it's considered hung (2 minutes).
		// Deploying contracts in beforeEach can be slow on Node 25 with
		// TypeScript compilation, so we give it plenty of room.
	},

	// ─── TypeChain code generation ────────────────────────────────────────────────
	// After `npm run compile`, TypeChain reads the compiled ABIs and auto-generates
	// TypeScript classes for each contract. This means your test files get full type
	// checking: wrong argument types or missing return values are caught at compile
	// time, not at runtime.
	typechain: {
		outDir: "artifacts/typechain-types", // where the generated .ts files land
		target: "ethers-v6", // generate classes compatible with ethers v6 API
	},

	// ─── Etherscan / block explorer verification ──────────────────────────────────
	// After deploying, `hardhat verify` submits source code to the block explorer
	// so users can read and interact with your contract on the web UI.
	etherscan: {
		apiKey: {
			// Arbiscan is the block explorer for Arbitrum networks.
			// Get a free key at https://arbiscan.io/register
			arbitrumSepolia: process.env.ETHERSCAN_API_KEY ?? "",
		},
		// Hardhat's built-in explorer list doesn't include every network.
		// This block manually registers Arbitrum Sepolia so the verify command knows
		// which API endpoint and browser URL to use.
		customChains: [
			{
				network: "arbitrumSepolia",
				chainId: 421614,
				urls: {
					apiURL: "https://api-sepolia.arbiscan.io/api", // submission endpoint
					browserURL: "https://sepolia.arbiscan.io", // human-readable explorer
				},
			},
		],
	},
};

export default config;
