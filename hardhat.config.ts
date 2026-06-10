// hardhat.config.ts - central configuration for the Hardhat development environment.
// Hardhat is a JavaScript/TypeScript toolkit for compiling, testing, and deploying
// Solidity smart contracts. Everything it does is driven by this file.

import { configVariable, defineConfig } from "hardhat/config";

// Hardhat 3 plugins used by this project. Keep these explicit instead of using
// the all-in-one toolbox so unused Ignition/Verify dependencies do not enter
// the audit surface.
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import hardhatTypechain from "@nomicfoundation/hardhat-typechain";

// dotenv reads a .env file in the project root and loads its key=value pairs into
// process.env so we can access secrets (RPC URL, private key, API key) without
// hardcoding them.
import { config as conf } from "dotenv";
conf();

function readOptionalEnv(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value === undefined || value === "" ? undefined : value;
}

function readOptionalIntegerEnv(name: string): number | undefined {
	const value = readOptionalEnv(name);
	if (value === undefined) return undefined;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new Error(`${name} must be a non-negative safe integer when set.`);
	}
	return parsed;
}

const forkUrl = readOptionalEnv("FORK_URL");
const forkBlockNumber = readOptionalIntegerEnv("FORK_BLOCK_NUMBER");

const config = defineConfig({
	plugins: [
		hardhatEthers,
		hardhatEthersChaiMatchers,
		hardhatMocha,
		hardhatNetworkHelpers,
		hardhatTypechain,
	],

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
			type: "edr-simulated",
			chainType: "l1",
			chainId: 31337, // standard local chain ID; tools like MetaMask recognise it
			...(forkUrl !== undefined
				? {
						forking: {
							url: forkUrl,
							...(forkBlockNumber !== undefined
								? { blockNumber: forkBlockNumber }
								: {}),
						},
					}
				: {}),
		},

		// HTTP endpoint used by `npm run node` plus local deploy/demo scripts.
		// Hardhat 3 requires network types to be explicit, so keep this separate
		// from the in-process EDR network above.
		localhost: {
			type: "http",
			chainType: "l1",
			url: "http://127.0.0.1:8545",
			chainId: 31337,
		},

		// Ethereum Sepolia - the L1 testnet used for development and testing only.
		// Values are read from .env so private keys never touch source control.
		sepolia: {
			type: "http",
			chainType: "l1",
			url: configVariable("SEPOLIA_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
			chainId: 11155111,
		},

		// ── L2 production targets ─────────────────────────────────────────────
		// Gas costs on L1 are prohibitive for typical contract values; these L2s
		// provide EVM-equivalent execution at a fraction of the cost.

		arbitrumOne: {
			type: "http",
			chainType: "generic",
			url: configVariable("ARBITRUM_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
			chainId: 42161,
		},

		base: {
			type: "http",
			chainType: "op",
			url: configVariable("BASE_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
			chainId: 8453,
		},

		optimism: {
			type: "http",
			chainType: "op",
			url: configVariable("OPTIMISM_RPC_URL"),
			accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
			chainId: 10,
		},
	},

	test: {
		// ─── Mocha test runner settings ───────────────────────────────────────────────
		// Mocha is the test framework Hardhat uses to run .test.ts files.
		mocha: {
			timeout: 120000, // milliseconds per test before it's considered hung (2 minutes).
			// Deploying contracts in beforeEach can be slow on Node 25 with
			// TypeScript compilation, so we give it plenty of room.
		},
	},

	// ─── TypeChain code generation ────────────────────────────────────────────────
	// After `npm run compile`, TypeChain reads the compiled ABIs and auto-generates
	// TypeScript classes for each contract. This means your test files get full type
	// checking: wrong argument types or missing return values are caught at compile
	// time, not at runtime.
	typechain: {
		outDir: "artifacts/typechain-types", // where the generated .ts files land
	},
});

export default config;
