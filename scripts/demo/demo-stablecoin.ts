// scripts/demo/demo-stablecoin.ts - Stablecoin Escrow Demo
// Shows: ERC-20 token escrow (no ETH locked), gas comparison vs ETH escrow,
//        and bidirectional reputation rating after contract completion.
//
// Run with: npm run demo:stablecoin
// Requires: npm run node + npm run hardhat:deploy:local

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import type { LogDescription } from "ethers";
import type { TrustLedger, MockERC20, ReputationRegistry } from "../../artifacts/typechain-types";

interface DeployedAddresses {
	TrustLedger: string;
	Arbitration: string;
	JurorRegistry: string;
	ReputationRegistry?: string;
}

function loadAddresses(): DeployedAddresses {
	const path = resolve(__dirname, "../../artifacts/deployed-addresses.json");
	try {
		return JSON.parse(readFileSync(path, "utf8")) as DeployedAddresses;
	} catch {
		throw new Error(
			`artifacts/deployed-addresses.json not found.\nRun: npm run compile && npm run hardhat:deploy:local`,
		);
	}
}

async function main(): Promise<void> {
	const [client, freelancer] = await ethers.getSigners();
	const addrs = loadAddresses();
	const { TrustLedger: TRUST_LEDGER, ReputationRegistry: REPUTATION_REGISTRY } = addrs;

	console.log("=".repeat(60));
	console.log("  TrustLedger - Stablecoin Escrow Demo");
	console.log("  (ERC-20 token escrow + gas comparison + reputation)");
	console.log("=".repeat(60));
	console.log(`  Client     : ${client.address}`);
	console.log(`  Freelancer : ${freelancer.address}`);
	console.log();

	const tl = (await ethers.getContractAt("TrustLedger", TRUST_LEDGER)) as unknown as TrustLedger;

	// ── Step 1: Deploy MockERC20 as a local stablecoin ───────────────────────
	console.log("Step 1 - Deploying MockERC20 stablecoin (simulates USDC)...");
	const MockERC20Factory = await ethers.getContractFactory("MockERC20");
	const token = (await MockERC20Factory.deploy()) as unknown as MockERC20;
	await token.waitForDeployment();
	const tokenAddress = await token.getAddress();
	console.log(`  ok Token deployed : ${tokenAddress}`);
	console.log();

	// ── Step 2: Mint 2000 MOCK to client ─────────────────────────────────────
	console.log("Step 2 - Minting 2000 MOCK tokens to client...");
	const ESCROW_AMOUNT = ethers.parseUnits("1000", 18); // 1000 MOCK (18 decimals)
	await (await token.mint(client.address, ethers.parseUnits("2000", 18))).wait();
	const clientTokenBalance = await token.balanceOf(client.address);
	console.log(`  ok Client balance : ${ethers.formatUnits(clientTokenBalance, 18)} MOCK`);
	console.log();

	// ── Step 3: Gas benchmark - ETH escrow ───────────────────────────────────
	console.log("Step 3 - Gas benchmark: ETH escrow createContract...");
	const ethCreateTx = await tl
		.connect(client)
		.createContract(
			await freelancer.getAddress(),
			ethers.keccak256(ethers.toUtf8Bytes("eth-benchmark")),
			"ipfs://QmEthBenchmark",
			30 * 24 * 3600,
			1200,
			48 * 3600,
			1500,
			0,
			0,
			ethers.ZeroAddress,
			0n,
			{ value: ethers.parseEther("1") },
		);
	const ethReceipt = await ethCreateTx.wait();
	if (ethReceipt === null) throw new Error("ETH createContract not mined");
	const ethGasUsed = ethReceipt.gasUsed;
	const ethContractId = ethReceipt.logs
		.map((l): LogDescription | null => {
			try {
				return tl.interface.parseLog(l);
			} catch {
				return null;
			}
		})
		.find((e): e is LogDescription => e !== null && e.name === "ContractCreated")?.args[0] as
		| bigint
		| undefined;
	if (ethContractId === undefined) throw new Error("ContractCreated not found");
	console.log(`  ok ETH escrow gas : ${ethGasUsed.toString()}`);

	// Cancel the ETH benchmark contract to recover funds
	await (await tl.connect(client).cancelPending(ethContractId)).wait();
	console.log(`  ok ETH benchmark contract cancelled (funds returned)`);
	console.log();

	// ── Step 4: Gas benchmark - ERC-20 escrow ────────────────────────────────
	console.log("Step 4 - Gas benchmark: ERC-20 escrow createContract...");
	await (await token.connect(client).approve(TRUST_LEDGER, ESCROW_AMOUNT)).wait();

	const erc20CreateTx = await tl.connect(client).createContract(
		await freelancer.getAddress(),
		ethers.keccak256(ethers.toUtf8Bytes("stablecoin-escrow-v1")),
		"ipfs://QmStablecoinDemo",
		30 * 24 * 3600,
		1200,
		48 * 3600,
		1500,
		0,
		0,
		tokenAddress,
		ESCROW_AMOUNT,
		// No msg.value - tokens are pulled via transferFrom
	);
	const erc20Receipt = await erc20CreateTx.wait();
	if (erc20Receipt === null) throw new Error("ERC-20 createContract not mined");
	const erc20GasUsed = erc20Receipt.gasUsed;
	const contractId = erc20Receipt.logs
		.map((l): LogDescription | null => {
			try {
				return tl.interface.parseLog(l);
			} catch {
				return null;
			}
		})
		.find((e): e is LogDescription => e !== null && e.name === "ContractCreated")?.args[0] as
		| bigint
		| undefined;
	if (contractId === undefined) throw new Error("ContractCreated not found");

	const clientBalanceAfterCreate = await token.balanceOf(client.address);
	const contractTokenBalance = await token.balanceOf(TRUST_LEDGER);

	console.log(`  ok ERC-20 escrow gas : ${erc20GasUsed.toString()}`);
	console.log(`  ok Contract ID       : ${contractId.toString()}`);
	console.log(
		`  ok Client balance    : ${ethers.formatUnits(clientBalanceAfterCreate, 18)} MOCK (was 2000, locked 1000)`,
	);
	console.log(`  ok Locked in escrow  : ${ethers.formatUnits(contractTokenBalance, 18)} MOCK`);
	console.log();

	// ── Gas comparison summary ────────────────────────────────────────────────
	const gasDiff = ethGasUsed - erc20GasUsed;
	const sign = gasDiff >= 0n ? "+" : "-";
	console.log("  Gas comparison:");
	console.log(`    ETH escrow   : ${ethGasUsed.toString()} gas`);
	console.log(`    ERC-20 escrow: ${erc20GasUsed.toString()} gas`);
	console.log(`    Difference   : ${sign}${(gasDiff < 0n ? -gasDiff : gasDiff).toString()} gas`);
	console.log(`    Note: on Arbitrum/Base/Optimism, stablecoin escrows eliminate ETH`);
	console.log(`          price exposure while keeping gas costs the same as ETH escrows.`);
	console.log();

	// ── Step 5: Freelancer accepts ────────────────────────────────────────────
	console.log("Step 5 - Freelancer accepts the contract...");
	const innerHash = ethers.solidityPackedKeccak256(
		["uint256", "address"],
		[contractId, await freelancer.getAddress()],
	);
	const sig = ethers.Signature.from(await freelancer.signMessage(ethers.getBytes(innerHash)));
	await (await tl.connect(freelancer).acceptContract(contractId, sig.v, sig.r, sig.s)).wait();
	console.log("  ok Accepted");
	console.log();

	// ── Step 6: Freelancer submits work ──────────────────────────────────────
	console.log("Step 6 - Freelancer submits proof of work...");
	await (
		await tl
			.connect(freelancer)
			.submitProofOfWork(
				contractId,
				ethers.keccak256(ethers.toUtf8Bytes("stablecoin-proof-v1")),
				"ipfs://QmStablecoinProof",
			)
	).wait();
	console.log("  ok Proof submitted");
	console.log();

	// ── Step 7: Client approves - tokens released to freelancer ──────────────
	console.log("Step 7 - Client approves work, tokens released to freelancer...");
	const freelancerBalBefore = await token.balanceOf(freelancer.address);
	await (await tl.connect(client).approveWork(contractId)).wait();
	const freelancerBalAfter = await token.balanceOf(freelancer.address);
	const received = freelancerBalAfter - freelancerBalBefore;

	console.log(
		`  ok Freelancer received : ${ethers.formatUnits(received, 18)} MOCK (of 1000 escrowed)`,
	);
	console.log(
		`     (small deduction is the 15% arbitration fee reserve held in ETH, not tokens)`,
	);
	console.log();

	// ── Step 8: Reputation rating ─────────────────────────────────────────────
	if (REPUTATION_REGISTRY === undefined) {
		console.log("Step 8 - Skipping reputation (ReputationRegistry not deployed yet).");
		console.log("         Re-run: npm run compile && npm run hardhat:deploy:local");
	} else {
		console.log("Step 8 - Both parties submit reputation ratings...");

		const ratingTx1 = await tl.connect(client).submitRating(contractId, 95);
		await ratingTx1.wait();
		console.log("  ok Client rated freelancer: 95 / 100");

		const ratingTx2 = await tl.connect(freelancer).submitRating(contractId, 90);
		await ratingTx2.wait();
		console.log("  ok Freelancer rated client: 90 / 100");
		console.log();

		// Read reputation scores from ReputationRegistry
		console.log("Step 9 - Reading reputation scores from ReputationRegistry...");
		const repRegistry = (await ethers.getContractAt(
			"ReputationRegistry",
			REPUTATION_REGISTRY,
		)) as unknown as ReputationRegistry;

		const [flNum, flDen] = await repRegistry.averageRating(freelancer.address);
		const [clNum, clDen] = await repRegistry.averageRating(client.address);

		const formatScore = (num: bigint, den: bigint): string =>
			den === 0n
				? "no ratings"
				: `${num.toString()} / ${den.toString()} ratings = ${(Number(num) / Number(den)).toFixed(1)} avg`;

		console.log(`  ok Freelancer reputation : ${formatScore(flNum, flDen)}`);
		console.log(`  ok Client reputation     : ${formatScore(clNum, clDen)}`);
	}

	console.log();
	console.log("=".repeat(60));
	console.log("  Stablecoin escrow demo complete!");
	console.log("  Key points:");
	console.log("    - ERC-20 escrow requires no ETH locked (just token approval)");
	console.log("    - Gas cost is comparable to ETH escrows");
	console.log("    - On Arbitrum/Base/OP: gas fees are ~10-100x cheaper than mainnet");
	console.log("    - Reputation ratings are stored on-chain after each completed job");
	console.log("=".repeat(60));
}

main().catch((err: unknown): void => {
	console.error(err);
	process.exit(1);
});
