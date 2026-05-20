// scripts/demo/demo-scenarios.ts - All 5 case scenarios in one script.
//
// Set DEMO_SCENARIO=1..5 before running:
//   DEMO_SCENARIO=1 hardhat run scripts/demo/demo-scenarios.ts --network localhost
//
// Or use the interactive runner: scripts/run-demo.sh
//
// Scenarios:
//   1 - Plaintiff (client) wins          : unanimous 0% ruling
//   2 - Defendant (freelancer) wins      : unanimous 100% ruling
//   3 - Tie                              : unanimous 50% ruling
//   4 - Arbitration in favor of client   : J1=0%, J2=0%, J3=100% (minority) → median 0%
//   5 - Arbitration in favor of freelancer: J1=100%, J2=100%, J3=0% (minority) → median 100%

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

interface ScenarioConfig {
	title: string;
	description: string;
	j1Vote: number;
	j2Vote: number;
	j3Vote: number;
	expectedOutcome: string;
}

const SCENARIOS: Record<number, ScenarioConfig> = {
	1: {
		title: "Scenario 1 - Plaintiff (Client) Wins",
		description: "Unanimous ruling: all 3 jurors vote 0% completion",
		j1Vote: 0,
		j2Vote: 0,
		j3Vote: 0,
		expectedOutcome: "Full refund to client (minus 15% arbitration fee)",
	},
	2: {
		title: "Scenario 2 - Defendant (Freelancer) Wins",
		description: "Unanimous ruling: all 3 jurors vote 100% completion",
		j1Vote: 100,
		j2Vote: 100,
		j3Vote: 100,
		expectedOutcome: "Full payment to freelancer (minus 15% arbitration fee)",
	},
	3: {
		title: "Scenario 3 - Tie",
		description: "Unanimous ruling: all 3 jurors vote 50% completion",
		j1Vote: 50,
		j2Vote: 50,
		j3Vote: 50,
		expectedOutcome: "Split: freelancer ~0.258 ETH, client ~0.592 ETH",
	},
	4: {
		title: "Scenario 4 - Arbitration Ruling, In Favor of Client",
		description: "Split ruling: J1=0%, J2=0%, J3=100% (minority) → median 0%",
		j1Vote: 0,
		j2Vote: 0,
		j3Vote: 100,
		expectedOutcome: "Refund to client; J3 severely slashed (100 pt deviation from median)",
	},
	5: {
		title: "Scenario 5 - Arbitration Ruling, In Favor of Freelancer",
		description: "Split ruling: J1=100%, J2=100%, J3=0% (minority) → median 100%",
		j1Vote: 100,
		j2Vote: 100,
		j3Vote: 0,
		expectedOutcome:
			"Full payment to freelancer; J3 severely slashed (100 pt deviation from median)",
	},
};

const {
	TrustLedger: TRUST_LEDGER,
	Arbitration: ARBITRATION,
	JurorRegistry: JUROR_REGISTRY,
} = loadAddresses();

type Signer = Awaited<ReturnType<typeof ethers.getSigners>>[number];

async function tryRegister(jr: JurorRegistry, juror: Signer): Promise<void> {
	try {
		await (await jr.connect(juror).register({ value: ethers.parseEther("0.1") })).wait();
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes("AlreadyRegistered")) {
			console.log(`  i  ${juror.address.slice(0, 10)}... already registered`);
		} else {
			throw e;
		}
	}
}

async function main(): Promise<void> {
	const scenarioNum = parseInt(process.env.DEMO_SCENARIO ?? "0", 10);

	if (!(scenarioNum in SCENARIOS)) {
		console.error(
			`Invalid DEMO_SCENARIO="${process.env.DEMO_SCENARIO ?? ""}". Must be 1-5.\n` +
				`  1 - Plaintiff (client) wins\n` +
				`  2 - Defendant (freelancer) wins\n` +
				`  3 - Tie\n` +
				`  4 - Arbitration ruling, in favor of client\n` +
				`  5 - Arbitration ruling, in favor of freelancer`,
		);
		process.exit(1);
	}

	const scenario = SCENARIOS[scenarioNum];

	const [client, freelancer, j1, j2, j3] = await ethers.getSigners();
	const isArbitrationScenario = scenario.j3Vote !== scenario.j1Vote;
	const sortedVotes = [scenario.j1Vote, scenario.j2Vote, scenario.j3Vote].sort(
		(a: number, b: number): number => a - b,
	);
	const median = sortedVotes[1] ?? 0;

	console.log("=".repeat(60));
	console.log(`  TrustLedger Demo`);
	console.log(`  ${scenario.title}`);
	console.log("=".repeat(60));
	console.log(`  ${scenario.description}`);
	console.log(`  Expected : ${scenario.expectedOutcome}`);
	console.log(`  Median ruling will be: ${median.toString()}%`);
	console.log();
	console.log(`  Client     : ${client.address}`);
	console.log(`  Freelancer : ${freelancer.address}`);
	console.log(
		`  Juror 1    : ${j1.address.slice(0, 12)}...  votes ${scenario.j1Vote.toString()}%`,
	);
	console.log(
		`  Juror 2    : ${j2.address.slice(0, 12)}...  votes ${scenario.j2Vote.toString()}%`,
	);
	console.log(
		`  Juror 3    : ${j3.address.slice(0, 12)}...  votes ${scenario.j3Vote.toString()}%${isArbitrationScenario ? "  <- minority" : ""}`,
	);
	console.log();

	const tl = (await ethers.getContractAt("TrustLedger", TRUST_LEDGER)) as unknown as TrustLedger;
	const arb = (await ethers.getContractAt("Arbitration", ARBITRATION)) as unknown as Arbitration;
	const jr = (await ethers.getContractAt(
		"JurorRegistry",
		JUROR_REGISTRY,
	)) as unknown as JurorRegistry;

	// ── Step 1: Register jurors ───────────────────────────────────────────────
	console.log("Step 1 - Registering jurors (0.1 ETH stake each)...");
	await tryRegister(jr, j1);
	await tryRegister(jr, j2);
	await tryRegister(jr, j3);

	// Capture J3 stake before (to show slashing impact later)
	const j3Before = isArbitrationScenario ? await jr.getJuror(j3.address) : null;

	console.log("  ok J1, J2, J3 registered");
	console.log();

	// ── Step 2: Fast-forward past 7-day stake lock ───────────────────────────
	console.log("Step 2 - Fast-forwarding 7 days (stake lock period)...");
	await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	console.log("  ok Jurors now eligible to vote");
	console.log();

	// ── Step 3: Create 1 ETH escrow ──────────────────────────────────────────
	console.log("Step 3 - Client creates a 1 ETH escrow...");
	const createTx = await tl
		.connect(client)
		.createContract(
			await freelancer.getAddress(),
			ethers.keccak256(ethers.toUtf8Bytes(`scenario-${scenarioNum.toString()}-contract`)),
			"ipfs://QmDemo",
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
	if (createReceipt === null) throw new Error("createContract tx not mined");

	const createEvent = createReceipt.logs
		.map((log): LogDescription | null => {
			try {
				return tl.interface.parseLog(log);
			} catch {
				return null;
			}
		})
		.find((e): e is LogDescription => e !== null && e.name === "ContractCreated");
	if (createEvent === undefined) throw new Error("ContractCreated event not found");
	const contractId = createEvent.args[0] as bigint;
	console.log(`  ok Contract ID : ${contractId.toString()}`);
	console.log();

	// ── Step 4: Freelancer accepts & submits proof ───────────────────────────
	console.log("Step 4 - Freelancer accepts and submits proof of work...");
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
				ethers.keccak256(ethers.toUtf8Bytes(`scenario-${scenarioNum.toString()}-proof`)),
				"ipfs://QmProof",
			)
	).wait();
	console.log("  ok Accepted and proof submitted");
	console.log();

	// ── Step 5: Client opens dispute ─────────────────────────────────────────
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
	console.log(`  ok Dispute ID : ${disputeId.toString()}`);
	console.log();

	// ── Step 6: Jurors commit hidden votes ───────────────────────────────────
	console.log("Step 6 - Jurors commit hidden votes...");
	const saltA = ethers.randomBytes(32); // used by J1 and J2 (and J3 when unanimous)
	const saltB = ethers.randomBytes(32); // used by J3 when minority

	const j3Salt = isArbitrationScenario ? saltB : saltA;

	const makeCommit = (addr: string, pct: number, salt: Uint8Array): string =>
		ethers.solidityPackedKeccak256(
			["uint256", "address", "uint256", "bytes32"],
			[disputeId, addr, pct, salt],
		);

	await (
		await arb.connect(j1).commitVote(disputeId, makeCommit(j1.address, scenario.j1Vote, saltA))
	).wait();
	await (
		await arb.connect(j2).commitVote(disputeId, makeCommit(j2.address, scenario.j2Vote, saltA))
	).wait();
	await (
		await arb.connect(j3).commitVote(disputeId, makeCommit(j3.address, scenario.j3Vote, j3Salt))
	).wait();

	console.log(`  ok J1 committed (${scenario.j1Vote.toString()}%)`);
	console.log(`  ok J2 committed (${scenario.j2Vote.toString()}%)`);
	console.log(
		`  ok J3 committed (${scenario.j3Vote.toString()}%)${isArbitrationScenario ? "  <- minority vote" : ""}`,
	);
	console.log();

	// ── Step 7: Advance to reveal phase ──────────────────────────────────────
	console.log("Step 7 - Advancing to reveal phase (all 3 committed)...");
	await (await arb.advanceToReveal(disputeId)).wait();
	console.log("  ok In reveal phase");
	console.log();

	// ── Step 8: Jurors reveal votes ───────────────────────────────────────────
	console.log("Step 8 - Jurors reveal votes...");
	await (await arb.connect(j1).revealVote(disputeId, scenario.j1Vote, saltA)).wait();
	await (await arb.connect(j2).revealVote(disputeId, scenario.j2Vote, saltA)).wait();
	await (await arb.connect(j3).revealVote(disputeId, scenario.j3Vote, j3Salt)).wait();
	console.log(
		`  ok All revealed - votes: [${scenario.j1Vote.toString()}%, ${scenario.j2Vote.toString()}%, ${scenario.j3Vote.toString()}%] -> median ${median.toString()}%`,
	);
	console.log();

	// ── Step 9: Fast-forward past 72-hour reveal window ───────────────────────
	console.log("Step 9 - Fast-forwarding past 72-hour reveal window...");
	await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	console.log("  ok Reveal window elapsed");
	console.log();

	// ── Step 10: Finalize dispute ─────────────────────────────────────────────
	console.log("Step 10 - Finalizing dispute (computing median ruling)...");
	await (await arb.finalizeDispute(disputeId)).wait();
	console.log(`  ok Ruling finalized: ${median.toString()}% completion`);
	console.log();

	// ── Step 11: Fast-forward past 72-hour appeal window ─────────────────────
	console.log("Step 11 - Fast-forwarding past 72-hour appeal window...");
	await ethers.provider.send("evm_increaseTime", [72 * 3600 + 1]);
	await ethers.provider.send("evm_mine", []);
	console.log("  ok Appeal window elapsed");
	console.log();

	// ── Step 12: Execute ruling ───────────────────────────────────────────────
	console.log("Step 12 - Executing ruling and releasing funds...");
	const clientBalBefore = await ethers.provider.getBalance(client.address);
	const freelancerBalBefore = await ethers.provider.getBalance(freelancer.address);

	await (await arb.executeRuling(disputeId)).wait();

	const clientBalAfter = await ethers.provider.getBalance(client.address);
	const freelancerBalAfter = await ethers.provider.getBalance(freelancer.address);
	const clientChange = clientBalAfter - clientBalBefore;
	const freelancerChange = freelancerBalAfter - freelancerBalBefore;

	console.log(`  ok Client received     : ${ethers.formatEther(clientChange)} ETH`);
	console.log(`  ok Freelancer received : ${ethers.formatEther(freelancerChange)} ETH`);
	console.log();

	// ── Minority slash summary (scenarios 4 and 5) ────────────────────────────
	if (isArbitrationScenario && j3Before !== null) {
		const j3After = await jr.getJuror(j3.address);
		const stakeDelta = j3After.stake - j3Before.stake;
		const repDelta = j3After.reputation - j3Before.reputation;
		const deviation = Math.abs(scenario.j3Vote - median);

		console.log("Minority Juror (J3) Slashing:");
		console.log(
			`  Vote        : ${scenario.j3Vote.toString()}%  (median was ${median.toString()}%)`,
		);
		console.log(
			`  Deviation   : ${deviation.toString()} pts -> exceeds SEVERE_MINORITY_THRESHOLD (30)`,
		);
		console.log(
			`  Stake       : ${ethers.formatEther(j3Before.stake)} -> ${ethers.formatEther(j3After.stake)} ETH  (${ethers.formatEther(stakeDelta)} ETH)`,
		);
		console.log(
			`  Reputation  : ${j3Before.reputation.toString()} -> ${j3After.reputation.toString()}  (${repDelta.toString()})`,
		);
		console.log();
	}

	// ── Final summary ─────────────────────────────────────────────────────────
	console.log("=".repeat(60));
	console.log(`  ${scenario.title}`);
	console.log(`  Median ruling : ${median.toString()}% completion`);
	console.log(
		`  Client payout : ${ethers.formatEther(clientChange)} ETH  |  Freelancer payout : ${ethers.formatEther(freelancerChange)} ETH`,
	);
	if (isArbitrationScenario) {
		console.log(
			`  J3 (minority) : severely slashed for deviating ${Math.abs(scenario.j3Vote - median).toString()} pts from median`,
		);
	}
	console.log("=".repeat(60));
}

main().catch((err: unknown): void => {
	console.error(err);
	process.exit(1);
});
