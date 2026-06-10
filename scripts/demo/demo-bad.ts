// scripts/demo/demo-bad.ts - Dispute Flow: create → accept → submit → dispute → vote → execute
// Run with: npm run demo:bad  (requires: npm run node + npm run hardhat:deploy:local first)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";
import type { LogDescription } from "ethers";
import type { TrustLedger, Arbitration, JurorRegistry } from "../../artifacts/typechain-types";

const { ethers } = await network.create();
const __dirname = fileURLToPath(new URL(".", import.meta.url));

interface DeployedAddresses {
	TrustLedger: string;
	Arbitration: string;
	JurorRegistry: string;
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

const {
	TrustLedger: TRUST_LEDGER,
	Arbitration: ARBITRATION,
	JurorRegistry: JUROR_REGISTRY,
} = loadAddresses();

async function main(): Promise<void> {
	const [client, freelancer, j1, j2, j3] = await ethers.getSigners();
	type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];

	console.log("=".repeat(60));
	console.log("  TrustLedger Demo - Dispute Flow");
	console.log("=".repeat(60));
	console.log(`Client     : ${client.address}`);
	console.log(`Freelancer : ${freelancer.address}`);
	console.log(`Juror 1    : ${j1.address}`);
	console.log(`Juror 2    : ${j2.address}`);
	console.log(`Juror 3    : ${j3.address}`);
	console.log();

	const tl = (await ethers.getContractAt("TrustLedger", TRUST_LEDGER)) as unknown as TrustLedger;
	const arb = (await ethers.getContractAt("Arbitration", ARBITRATION)) as unknown as Arbitration;
	const jr = (await ethers.getContractAt(
		"JurorRegistry",
		JUROR_REGISTRY,
	)) as unknown as JurorRegistry;

	// ── Step 1: Register jurors (0.1 ETH stake each) ──────────────────────────
	console.log("Step 1 - Registering jurors (0.1 ETH stake each)...");

	const tryRegister = async (juror: Signer): Promise<void> => {
		try {
			await (await jr.connect(juror).register({ value: ethers.parseEther("0.1") })).wait();
		} catch (e: unknown) {
			if (e instanceof Error && e.message.includes("AlreadyRegistered")) {
				console.log(`  ℹ  ${juror.address.slice(0, 10)}… already registered, skipping`);
			} else {
				throw e;
			}
		}
	};

	await tryRegister(j1);
	await tryRegister(j2);
	await tryRegister(j3);
	console.log("  ✓ j1, j2, j3 registered");
	console.log();

	// ── Step 2: Fast-forward past the 7-day stake lock ────────────────────────
	console.log("Step 2 - Fast-forwarding 7 days (stake lock period)...");
	await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	console.log("  ✓ Jurors now eligible to vote");
	console.log();

	// ── Step 3: Propose a 1 ETH escrow ────────────────────────────────────────
	console.log("Step 3 - Freelancer proposes a 1 ETH escrow...");
	const createTx = await tl.connect(freelancer).proposeContract(
		await client.getAddress(),
		ethers.keccak256(ethers.toUtf8Bytes("contract-v2")),
		"ipfs://QmDemo2",
		30 * 24 * 3600, // 30-day estimated duration
		1200, // 1.2× buffer factor
		48 * 3600, // 48-hour acceptance window
		1500, // 15% arbitration fee
		0,
		0, // no hold-back
		ethers.ZeroAddress,
		ethers.parseEther("1"), // escrow amount the client will lock
	);
	const createReceipt = await createTx.wait();
	if (createReceipt === null) throw new Error("proposeContract tx not mined");

	const createEvent = createReceipt.logs
		.map((log): LogDescription | null => {
			try {
				return tl.interface.parseLog(log);
			} catch {
				return null;
			}
		})
		.find((e): e is LogDescription => e !== null && e.name === "ContractProposed");
	if (createEvent === undefined) throw new Error("ContractProposed event not found");
	const contractId = createEvent.args[0] as bigint;
	console.log(`  ✓ Contract ID : ${contractId.toString()}`);
	console.log();

	// ── Step 4: Client accepts (funds escrow) & freelancer submits proof of work ──
	console.log("Step 4 - Client funds escrow; freelancer submits proof of work...");
	await (
		await tl.connect(client).acceptContract(contractId, { value: ethers.parseEther("1") })
	).wait();
	await (
		await tl
			.connect(freelancer)
			.submitProofOfWork(
				contractId,
				ethers.keccak256(ethers.toUtf8Bytes("proof-v2")),
				"ipfs://QmProof2",
			)
	).wait();
	console.log("  ✓ Accepted and proof submitted");
	console.log();

	// ── Step 5: Client disputes instead of approving ──────────────────────────
	console.log("Step 5 - Client opens a dispute...");
	const disputeTx = await tl.connect(client).disputeWork(contractId);
	const disputeReceipt = await disputeTx.wait();
	if (disputeReceipt === null) throw new Error("disputeWork tx not mined");

	const disputeEvent = disputeReceipt.logs
		.map((log): LogDescription | null => {
			try {
				return arb.interface.parseLog(log);
			} catch {
				return null;
			}
		})
		.find((e): e is LogDescription => e !== null && e.name === "DisputeOpened");
	if (disputeEvent === undefined) throw new Error("DisputeOpened event not found");
	const disputeId = disputeEvent.args[0] as bigint;

	console.log(`  ✓ Dispute ID  : ${disputeId.toString()}`);
	console.log(`  ✓ Tx hash     : ${disputeTx.hash}`);
	console.log();

	// ── Step 6: Jurors commit hidden votes (50% completion) ───────────────────
	console.log("Step 6 - Jurors commit hidden votes (50% completion ruling)...");
	const pct = 50;
	const salt = ethers.randomBytes(32);

	const makeCommit = (addr: string): string =>
		ethers.solidityPackedKeccak256(
			["uint256", "address", "uint256", "bytes32"],
			[disputeId, addr, pct, salt],
		);

	await (await arb.connect(j1).commitVote(disputeId, makeCommit(j1.address))).wait();
	await (await arb.connect(j2).commitVote(disputeId, makeCommit(j2.address))).wait();
	await (await arb.connect(j3).commitVote(disputeId, makeCommit(j3.address))).wait();
	console.log("  ✓ All 3 jurors committed");
	console.log();

	// ── Step 7: Advance to reveal phase (all 3 committed - skip 72h wait) ─────
	console.log("Step 7 - Advancing to reveal phase...");
	await (await arb.advanceToReveal(disputeId)).wait();
	console.log("  ✓ Now in reveal phase");
	console.log();

	// ── Step 8: Jurors reveal their votes ─────────────────────────────────────
	console.log("Step 8 - Jurors reveal votes...");
	await (await arb.connect(j1).revealVote(disputeId, pct, salt)).wait();
	await (await arb.connect(j2).revealVote(disputeId, pct, salt)).wait();
	await (await arb.connect(j3).revealVote(disputeId, pct, salt)).wait();
	console.log(`  ✓ All 3 jurors revealed: ${pct.toString()}% completion`);
	console.log();

	// ── Step 9: Fast-forward past the 72-hour reveal window ───────────────────
	console.log("Step 9 - Fast-forwarding past 72-hour reveal window...");
	await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	console.log("  ✓ Reveal window elapsed");
	console.log();

	// ── Step 10: Finalize - computes median ruling, slashes minority ──────────
	console.log("Step 10 - Finalizing dispute (median ruling)...");
	await (await arb.finalizeDispute(disputeId)).wait();
	console.log("  ✓ Dispute finalized");
	console.log();

	// ── Step 11: Fast-forward past 72-hour appeal window ─────────────────────
	console.log("Step 11 - Fast-forwarding past 72-hour appeal window...");
	await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	console.log("  ✓ Appeal window elapsed");
	console.log();

	// ── Step 12: Execute ruling - pays out based on median vote ───────────────
	console.log("Step 12 - Executing ruling, partial payout to freelancer...");
	const balBefore = await ethers.provider.getBalance(freelancer.address);
	await (await arb.executeRuling(disputeId)).wait();
	const balAfter = await ethers.provider.getBalance(freelancer.address);

	// Expected math with pct=50, ARB_FEE_BPS=1500:
	//   feePool          = 1 ETH × 15%       = 0.15 ETH
	//   remaining        = 0.85 ETH
	//   rawPay           = (2 × 50 × 1 ETH) / 300 ≈ 0.333 ETH
	//   freelancerFee    = 0.15 × 50 / 100   = 0.075 ETH
	//   freelancerPay    ≈ 0.333 − 0.075     ≈ 0.258 ETH
	console.log(`  ✓ Freelancer received : ${ethers.formatEther(balAfter - balBefore)} ETH`);
	console.log(`    (50% ruling after 15% arb fee ≈ 0.258 ETH expected)`);
	console.log();

	console.log("=".repeat(60));
	console.log("  Dispute flow complete - ruling executed!");
	console.log("=".repeat(60));
}

main().catch((err: unknown): void => {
	console.error(err);
	process.exit(1);
});
