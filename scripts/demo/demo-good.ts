// scripts/demo/demo-good.ts — Happy Path: create → accept → submit → approve
// Run with: npm run demo:good  (requires: npm run node + npm run hardhat:deploy:local first)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "hardhat";
import type { LogDescription } from "ethers";
import type { TrustLedger } from "../../artifacts/typechain-types";

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

const { TrustLedger: TRUST_LEDGER } = loadAddresses();

async function main(): Promise<void> {
	const [client, freelancer] = await ethers.getSigners();

	console.log("=".repeat(60));
	console.log("  TrustLedger Demo — Happy Path");
	console.log("=".repeat(60));
	console.log(`Client     : ${client.address}`);
	console.log(`Freelancer : ${freelancer.address}`);
	console.log(`Contract   : ${TRUST_LEDGER}`);
	console.log();

	const tl = (await ethers.getContractAt("TrustLedger", TRUST_LEDGER)) as unknown as TrustLedger;

	// ── Step 1: Client creates a 1 ETH escrow ─────────────────────────────────
	console.log("Step 1 — Client creates a 1 ETH escrow...");
	const createTx = await tl.connect(client).createContract(
		await freelancer.getAddress(),
		ethers.keccak256(ethers.toUtf8Bytes("contract-v1")),
		"ipfs://QmDemo",
		30 * 24 * 3600, // 30-day estimated duration
		1200, // 1.2× buffer factor
		48 * 3600, // 48-hour acceptance window
		1500, // 15% arbitration fee
		0,
		0, // no hold-back
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

	console.log(`  ✓ Contract ID : ${contractId.toString()}`);
	console.log(`  ✓ Tx hash     : ${createTx.hash}`);
	console.log();

	// ── Step 2: Freelancer accepts with ECDSA wallet binding ──────────────────
	console.log("Step 2 — Freelancer signs & accepts...");
	const innerHash = ethers.solidityPackedKeccak256(
		["uint256", "address"],
		[contractId, await freelancer.getAddress()],
	);
	const sig = ethers.Signature.from(await freelancer.signMessage(ethers.getBytes(innerHash)));
	const acceptTx = await tl.connect(freelancer).acceptContract(contractId, sig.v, sig.r, sig.s);
	await acceptTx.wait();
	console.log(`  ✓ Tx hash     : ${acceptTx.hash}`);
	console.log();

	// ── Step 3: Freelancer submits proof of work ───────────────────────────────
	console.log("Step 3 — Freelancer submits proof of work...");
	const powTx = await tl
		.connect(freelancer)
		.submitProofOfWork(
			contractId,
			ethers.keccak256(ethers.toUtf8Bytes("proof-v1")),
			"ipfs://QmProof",
		);
	await powTx.wait();
	console.log(`  ✓ Proof IPFS  : ipfs://QmProof`);
	console.log(`  ✓ Tx hash     : ${powTx.hash}`);
	console.log();

	// ── Step 4: Client approves — full 1 ETH released to freelancer ───────────
	console.log("Step 4 — Client approves, funds released...");
	const balBefore = await ethers.provider.getBalance(freelancer.address);
	const approveTx = await tl.connect(client).approveWork(contractId);
	await approveTx.wait();
	const balAfter = await ethers.provider.getBalance(freelancer.address);

	console.log(`  ✓ Freelancer received : ${ethers.formatEther(balAfter - balBefore)} ETH`);
	console.log(`  ✓ Tx hash            : ${approveTx.hash}`);
	console.log();

	console.log("=".repeat(60));
	console.log("  Happy path complete — all steps passed!");
	console.log("=".repeat(60));
}

main().catch((err: unknown): void => {
	console.error(err);
	process.exit(1);
});
