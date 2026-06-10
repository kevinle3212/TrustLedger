// scripts/wire-reputation-registry.ts - one-time recovery for TrustLedger
// deployments that were created before ReputationRegistry wiring was included.
//
// Usage:
//   TRUSTLEDGER_ADDRESS=0x... npm run hardhat:wire-reputation:sepolia
// If TRUSTLEDGER_ADDRESS is omitted, the script reads the latest broadcast
// artifact for the current chain.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const connection = await network.create();
const { ethers } = connection;
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function readLatestBroadcastTrustLedger(chainId: bigint): string | undefined {
	const path = resolve(
		__dirname,
		`../contracts/broadcast/Deploy.s.sol/${chainId.toString()}/run-latest.json`,
	);
	if (!existsSync(path)) return undefined;

	const broadcast = JSON.parse(readFileSync(path, "utf8")) as {
		transactions?: { contractName?: string; contractAddress?: string }[];
	};

	return broadcast.transactions?.find((tx): boolean => tx.contractName === "TrustLedger")
		?.contractAddress;
}

async function main(): Promise<void> {
	const [deployer] = await ethers.getSigners();
	const chain = await ethers.provider.getNetwork();
	const trustLedgerAddress =
		process.env.TRUSTLEDGER_ADDRESS ?? readLatestBroadcastTrustLedger(chain.chainId);

	if (trustLedgerAddress === undefined || !ethers.isAddress(trustLedgerAddress)) {
		throw new Error(
			"Set TRUSTLEDGER_ADDRESS=0x... or provide contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json.",
		);
	}

	console.log(`Network: ${connection.networkName} (${chain.chainId.toString()})`);
	console.log(`Deployer: ${deployer.address}`);
	console.log(`TrustLedger: ${trustLedgerAddress}`);

	const trustLedger = await ethers.getContractAt("TrustLedger", trustLedgerAddress);
	const currentRegistry = (await trustLedger.reputationRegistry()) as string;

	if (currentRegistry !== ZERO_ADDRESS) {
		console.log(`Already wired: ${currentRegistry}`);
		return;
	}

	const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
	const reputationRegistry = await ReputationRegistry.deploy(trustLedgerAddress);
	await reputationRegistry.waitForDeployment();
	const deployReceipt = await reputationRegistry.deploymentTransaction()?.wait();
	const reputationRegistryAddress = await reputationRegistry.getAddress();

	console.log(`ReputationRegistry: ${reputationRegistryAddress}`);

	const initTx = await trustLedger.initReputationRegistry(reputationRegistryAddress);
	const initReceipt = await initTx.wait();

	console.log(`Wired TrustLedger -> ReputationRegistry in tx ${initTx.hash}`);

	const outDir = resolve(__dirname, "../artifacts");
	mkdirSync(outDir, { recursive: true });
	writeFileSync(
		resolve(outDir, "reputation-registry-wire.json"),
		JSON.stringify(
			{
				network: connection.networkName,
				chainId: chain.chainId.toString(),
				TrustLedger: trustLedgerAddress,
				ReputationRegistry: reputationRegistryAddress,
				TrustLedgerDeployBlock: deployReceipt?.blockNumber ?? initReceipt?.blockNumber ?? 0,
				wiredAt: new Date().toISOString(),
				initTransactionHash: initTx.hash,
			},
			null,
			2,
		),
	);
	console.log("Wrote artifacts/reputation-registry-wire.json");
}

main().catch((err: unknown): void => {
	console.error(err);
	process.exit(1);
});
