// scripts/demo/demo-jurors.ts - Juror reputation system demo
// Shows: registration, stake lock bypass, commit-reveal voting,
//        minority-vote slashing, and before/after reputation table.
//
// Run with: npm run demo:jurors
// Requires: npm run node + npm run hardhat:deploy:local

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import type { LogDescription } from "ethers";
import type { TrustLedger, Arbitration, JurorRegistry } from "../../artifacts/typechain-types";

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

type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];

interface JurorSnapshot {
	label: string;
	address: string;
	stake: bigint;
	reputation: bigint;
	minorityVotes: bigint;
	disputesParticipated: bigint;
}

async function snapshot(
	jr: JurorRegistry,
	label: string,
	addr: string,
	tag: string,
): Promise<JurorSnapshot> {
	const j = await jr.getJuror(addr);
	return {
		label: tag,
		address: addr,
		stake: j.stake,
		reputation: j.reputation,
		minorityVotes: j.minorityVotes,
		disputesParticipated: j.disputesParticipated,
	};
}

function printTable(rows: JurorSnapshot[]): void {
	const COL = 14;
	const header = [
		"Juror".padEnd(10),
		"Stake (ETH)".padEnd(COL),
		"Reputation".padEnd(COL),
		"Minority Votes".padEnd(COL),
		"Disputes".padEnd(COL),
	].join(" │ ");
	const divider = "─".repeat(header.length);
	console.log(divider);
	console.log(header);
	console.log(divider);
	for (const r of rows) {
		console.log(
			[
				r.label.padEnd(10),
				ethers.formatEther(r.stake).padEnd(COL),
				r.reputation.toString().padEnd(COL),
				r.minorityVotes.toString().padEnd(COL),
				r.disputesParticipated.toString().padEnd(COL),
			].join(" │ "),
		);
	}
	console.log(divider);
}

async function tryRegister(jr: JurorRegistry, juror: Signer, stake: string): Promise<void> {
	try {
		await (await jr.connect(juror).register({ value: ethers.parseEther(stake) })).wait();
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes("AlreadyRegistered")) {
			console.log(`  ℹ  ${juror.address.slice(0, 10)}… already registered, skipping`);
		} else {
			throw e;
		}
	}
}

async function main(): Promise<void> {
	const [client, freelancer, j1, j2, j3] = await ethers.getSigners();

	console.log("=".repeat(60));
	console.log("  TrustLedger - Juror Reputation Demo");
	console.log("=".repeat(60));
	console.log(`  J1 (majority) : ${j1.address}`);
	console.log(`  J2 (majority) : ${j2.address}`);
	console.log(`  J3 (minority) : ${j3.address}  ← will vote against majority`);
	console.log();

	const tl = (await ethers.getContractAt("TrustLedger", TRUST_LEDGER)) as unknown as TrustLedger;
	const arb = (await ethers.getContractAt("Arbitration", ARBITRATION)) as unknown as Arbitration;
	const jr = (await ethers.getContractAt(
		"JurorRegistry",
		JUROR_REGISTRY,
	)) as unknown as JurorRegistry;

	// ── Step 1: Register jurors with different stake amounts ──────────────────
	console.log("Step 1 - Registering jurors...");
	await tryRegister(jr, j1, "0.10");
	await tryRegister(jr, j2, "0.20");
	await tryRegister(jr, j3, "0.30");
	console.log("  ✓ J1: 0.10 ETH  J2: 0.20 ETH  J3: 0.30 ETH");
	console.log();

	// ── Step 2: Capture baseline snapshot ────────────────────────────────────
	const before: JurorSnapshot[] = [
		await snapshot(jr, "before", j1.address, "J1 (before)"),
		await snapshot(jr, "before", j2.address, "J2 (before)"),
		await snapshot(jr, "before", j3.address, "J3 (before)"),
	];

	console.log("Baseline reputation:");
	printTable(before);
	console.log();

	// ── Step 3: Fast-forward past the 7-day stake lock ────────────────────────
	console.log("Step 2 - Fast-forwarding 7 days (stake lock)...");
	await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	const eligible = await jr.eligibleJurorCount();
	console.log(`  ✓ ${eligible.toString()} jurors now eligible`);
	console.log();

	// ── Step 4: Create escrow + dispute ───────────────────────────────────────
	console.log("Step 3 - Creating contract and opening dispute...");
	const createTx = await tl
		.connect(client)
		.createContract(
			await freelancer.getAddress(),
			ethers.keccak256(ethers.toUtf8Bytes("juror-demo-contract")),
			"ipfs://QmJurorDemo",
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
	const createReceipt = await createTx.wait();
	if (createReceipt === null) throw new Error("createContract not mined");
	const contractId = createReceipt.logs
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

	const innerHash = ethers.solidityPackedKeccak256(
		["uint256", "address"],
		[contractId, await freelancer.getAddress()],
	);
	const sig = ethers.Signature.from(await freelancer.signMessage(ethers.getBytes(innerHash)));
	await (await tl.connect(freelancer).acceptContract(contractId, sig.v, sig.r, sig.s)).wait();
	await (
		await tl
			.connect(freelancer)
			.submitProofOfWork(
				contractId,
				ethers.keccak256(ethers.toUtf8Bytes("juror-demo-proof")),
				"ipfs://QmJurorDemoProof",
			)
	).wait();

	const disputeTx = await tl.connect(client).disputeWork(contractId);
	const disputeReceipt = await disputeTx.wait();
	if (disputeReceipt === null) throw new Error("disputeWork not mined");
	const disputeId = disputeReceipt.logs
		.map((l): LogDescription | null => {
			try {
				return arb.interface.parseLog(l);
			} catch {
				return null;
			}
		})
		.find((e): e is LogDescription => e !== null && e.name === "DisputeOpened")?.args[0] as
		| bigint
		| undefined;
	if (disputeId === undefined) throw new Error("DisputeOpened not found");
	console.log(`  ✓ Contract ID ${contractId.toString()}, Dispute ID ${disputeId.toString()}`);
	console.log();

	// ── Step 5: Commit votes - J1/J2 majority (70%), J3 minority (20%) ────────
	// J3 deviates 50 pct-points from the 70 median → exceeds SEVERE_MINORITY_THRESHOLD (30)
	// → 20% severe slash on J3's stake, -10 reputation
	console.log("Step 4 - Jurors commit hidden votes...");
	console.log("  J1 votes: 70%  (majority)");
	console.log("  J2 votes: 70%  (majority)");
	console.log("  J3 votes: 20%  (minority - 50 pts from median, triggers severe slash)");

	const pctMajority = 70;
	const pctMinority = 20;
	const saltMajority = ethers.randomBytes(32);
	const saltMinority = ethers.randomBytes(32);

	const commit = (addr: string, pct: number, salt: Uint8Array): string =>
		ethers.solidityPackedKeccak256(
			["uint256", "address", "uint256", "bytes32"],
			[disputeId, addr, pct, salt],
		);

	await (
		await arb.connect(j1).commitVote(disputeId, commit(j1.address, pctMajority, saltMajority))
	).wait();
	await (
		await arb.connect(j2).commitVote(disputeId, commit(j2.address, pctMajority, saltMajority))
	).wait();
	await (
		await arb.connect(j3).commitVote(disputeId, commit(j3.address, pctMinority, saltMinority))
	).wait();
	console.log("  ✓ All 3 committed");
	console.log();

	// ── Step 6: Advance to reveal (all 3 committed - skip 72h wait) ───────────
	console.log("Step 5 - Advancing to reveal phase...");
	await (await arb.advanceToReveal(disputeId)).wait();
	console.log("  ✓ In reveal phase");
	console.log();

	// ── Step 7: Reveal ────────────────────────────────────────────────────────
	console.log("Step 6 - Jurors reveal votes...");
	await (await arb.connect(j1).revealVote(disputeId, pctMajority, saltMajority)).wait();
	await (await arb.connect(j2).revealVote(disputeId, pctMajority, saltMajority)).wait();
	await (await arb.connect(j3).revealVote(disputeId, pctMinority, saltMinority)).wait();
	console.log("  ✓ All revealed");
	console.log();

	// ── Step 8: Finalize + execute ────────────────────────────────────────────
	console.log("Step 7 - Finalizing and executing ruling...");
	await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	await (await arb.finalizeDispute(disputeId)).wait();
	await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	await (await arb.executeRuling(disputeId)).wait();
	console.log("  ✓ Ruling executed (70% completion → freelancer receives ~0.392 ETH)");
	console.log();

	// ── Step 9: After snapshot + diff ─────────────────────────────────────────
	const after: JurorSnapshot[] = [
		await snapshot(jr, "after", j1.address, "J1 (after) "),
		await snapshot(jr, "after", j2.address, "J2 (after) "),
		await snapshot(jr, "after", j3.address, "J3 (after) "),
	];

	console.log("Final reputation (after ruling):");
	printTable(after);
	console.log();

	// ── Step 10: Print diff summary ───────────────────────────────────────────
	console.log("Reputation changes:");
	const changes: [string, JurorSnapshot, JurorSnapshot][] = [
		["J1", before[0], after[0]],
		["J2", before[1], after[1]],
		["J3", before[2], after[2]],
	];
	for (const [label, b, a] of changes) {
		const repDelta = a.reputation - b.reputation;
		const stakeDelta = a.stake - b.stake;
		const tag = repDelta < 0n ? "  ✗ SLASHED" : "  ✓ OK     ";
		const repSign = repDelta >= 0n ? "+" : "";
		const stakeSign = stakeDelta >= 0n ? "+" : "";
		console.log(
			`${tag} ${label}  rep ${b.reputation.toString()}→${a.reputation.toString()} (${repSign}${repDelta.toString()})` +
				`  stake ${ethers.formatEther(b.stake)}→${ethers.formatEther(a.stake)} ETH (${stakeSign}${ethers.formatEther(stakeDelta)})`,
		);
	}
	console.log();
	console.log("=".repeat(60));
	console.log("  Juror reputation demo complete!");
	console.log("=".repeat(60));
}

main().catch((err: unknown): void => {
	console.error(err);
	process.exit(1);
});
