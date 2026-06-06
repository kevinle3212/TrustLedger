// hardhat.config.ts - central configuration for the Hardhat development environment.
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
			// viaIR compiles through Yul IR, which avoids "stack too deep" errors
			// that arise when a function has many local variables (e.g. proposeContract).
			viaIR: true,
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
		// When FORK_URL is set, Hardhat forks from that chain instead of starting blank -
		// this gives tests access to real deployed contracts, token balances, and chain
		// history, closely mimicking what production looks like.
		hardhat: {
			chainId: 31337, // standard local chain ID; tools like MetaMask recognise it
			...(process.env.FORK_URL !== undefined
				? {
						forking: {
							url: process.env.FORK_URL,
							...(process.env.FORK_BLOCK_NUMBER !== undefined
								? { blockNumber: parseInt(process.env.FORK_BLOCK_NUMBER, 10) }
								: {}),
						},
					}
				: {}),
		},

		// Ethereum Sepolia - the L1 testnet used for development and testing only.
		// Values are read from .env so private keys never touch source control.
		sepolia: {
			url: process.env.SEPOLIA_RPC_URL ?? "",
			accounts:
				typeof process.env.DEPLOYER_PRIVATE_KEY === "string"
					? [process.env.DEPLOYER_PRIVATE_KEY]
					: [],
			chainId: 11155111,
		},

		// ── L2 production targets ─────────────────────────────────────────────
		// Gas costs on L1 are prohibitive for typical contract values; these L2s
		// provide EVM-equivalent execution at a fraction of the cost.

		arbitrumOne: {
			url: process.env.ARBITRUM_RPC_URL ?? "",
			accounts:
				typeof process.env.DEPLOYER_PRIVATE_KEY === "string"
					? [process.env.DEPLOYER_PRIVATE_KEY]
					: [],
			chainId: 42161,
		},

		base: {
			url: process.env.BASE_RPC_URL ?? "",
			accounts:
				typeof process.env.DEPLOYER_PRIVATE_KEY === "string"
					? [process.env.DEPLOYER_PRIVATE_KEY]
					: [],
			chainId: 8453,
		},

		optimism: {
			url: process.env.OPTIMISM_RPC_URL ?? "",
			accounts:
				typeof process.env.DEPLOYER_PRIVATE_KEY === "string"
					? [process.env.DEPLOYER_PRIVATE_KEY]
					: [],
			chainId: 10,
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

	// ─── Gas reporter ────────────────────────────────────────────────────────────
	// hardhat-gas-reporter is bundled with hardhat-toolbox but disabled by default.
	// Set REPORT_GAS=true (or run `npm run hardhat:gas`) to activate it during tests.
	gasReporter: {
		enabled: process.env.REPORT_GAS === "true",
		currency: "USD",
	},

	// ─── Etherscan / block explorer verification ──────────────────────────────────
	// After deploying, `hardhat verify` submits source code to the block explorer
	// so users can read and interact with your contract on the web UI.
	etherscan: {
		apiKey: {
			// Etherscan - for Ethereum Sepolia. Get a key at etherscan.io/register
			sepolia: process.env.ETHERSCAN_API_KEY ?? "",
			// Arbiscan - for Arbitrum One. Get a key at arbiscan.io
			arbitrumOne: process.env.ARBISCAN_API_KEY ?? "",
			// Basescan - for Base. Get a key at basescan.org
			base: process.env.BASESCAN_API_KEY ?? "",
			// Optimism Etherscan - for Optimism. Get a key at optimistic.etherscan.io
			optimism: process.env.OPTIMISM_ETHERSCAN_API_KEY ?? "",
		},
	},
};

export default config;
