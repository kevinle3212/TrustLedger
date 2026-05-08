// test/TrustLedger.test.ts — Hardhat/Mocha/Chai test suite for TrustLedger.
// This file mirrors the Foundry unit tests but uses TypeScript + ethers.js,
// testing the same contract through the JavaScript ecosystem tools.
//
// Run with: npm run hardhat:test
//
// Key differences from Foundry tests:
//   - Time manipulation uses JSON-RPC calls instead of vm.warp()
//   - Impersonating an address requires hardhat_impersonateAccount
//   - BigInt (not number) for all on-chain integers (ethers v6 returns BigInt)
//   - `expect` from Chai replaces assertEq / assertTrue

import { expect } from "chai"; // Chai assertion library
import { ethers } from "hardhat"; // ethers.js injected by the Hardhat plugin
import type { Signer } from "ethers"; // type for a wallet/account that can sign transactions

// TypeChain-generated types: strongly-typed wrappers generated from the compiled ABI.
// These give TypeScript type-checking on every contract call — wrong argument types
// cause a compile error rather than a runtime revert.
import type { TrustLedger, JurorRegistry, Arbitration } from "../artifacts/typechain-types";

// `describe` groups related tests. Mocha displays these as nested sections in output.
describe("TrustLedger", function () {
	// ── Module-level variables ─────────────────────────────────────────────────
	// Declared here so all `it()` blocks (individual tests) can share them.
	// They're reset by `beforeEach` before every test.
	let trustLedger: TrustLedger;
	let jurorRegistry: JurorRegistry;
	let arbitration: Arbitration;
	let client: Signer; // an account that can sign and send transactions
	let freelancer: Signer;
	let stranger: Signer;

	// ── Constants ──────────────────────────────────────────────────────────────
	// BigInt literals (n suffix) are required for ethers v6 — all uint256 values
	// are BigInt in TypeScript, not regular numbers (which lose precision above 2^53).
	const AMOUNT = ethers.parseEther("1"); // 1 ETH in wei as BigInt
	const ESTIMATED_DURATION = 30n * 24n * 3600n; // 30 days in seconds
	const BUFFER_FACTOR = 1200n; // 1.2× multiplier
	const ACCEPTANCE_WINDOW = 48n * 3600n; // 48 hours in seconds
	const ARB_FEE_BPS = 1000; // 10% (kept as number for ABI compat)

	// ethers.keccak256 computes keccak256; ethers.toUtf8Bytes converts a string to bytes.
	const CONTRACT_HASH = ethers.keccak256(ethers.toUtf8Bytes("contract-doc"));
	const POW_HASH = ethers.keccak256(ethers.toUtf8Bytes("proof-of-work"));

	// ── deployContracts ────────────────────────────────────────────────────────
	// Deploys all three contracts in the correct order, solving the circular
	// dependency with precomputed addresses (same logic as the Foundry deploy).
	async function deployContracts() {
		// getSigners() returns the accounts configured for the active Hardhat network.
		// In tests, Hardhat provides 20 funded accounts by default.
		const signers = await ethers.getSigners();
		client = signers[0];
		freelancer = signers[1];
		stranger = signers[2];

		const clientAddr = await client.getAddress();

		// Read the current nonce (transaction count) for the client account.
		// Since `client` is the deployer, we predict where the 3rd contract lands.
		const nonce = await ethers.provider.getTransactionCount(clientAddr);

		// ethers.getCreateAddress({ from, nonce }) computes the deterministic CREATE address
		// for the given deployer + nonce, without actually deploying anything.
		// Arbitration will be at nonce+2 from the client's perspective.
		const arbitrationAddr = ethers.getCreateAddress({
			from: clientAddr,
			nonce: nonce + 2,
		});

		// ethers.getContractFactory reads compiled ABI + bytecode from artifacts/.
		// The second argument (`client`) sets the deployer (signer) for the factory.
		const JurorRegistryFactory = await ethers.getContractFactory("JurorRegistry", client);
		jurorRegistry = (await JurorRegistryFactory.deploy(
			arbitrationAddr,
		)) as unknown as JurorRegistry;
		// waitForDeployment() waits for the transaction to be mined before continuing.
		await jurorRegistry.waitForDeployment();

		const TrustLedgerFactory = await ethers.getContractFactory("TrustLedger", client);
		trustLedger = (await TrustLedgerFactory.deploy(arbitrationAddr)) as unknown as TrustLedger;
		await trustLedger.waitForDeployment();

		const ArbitrationFactory = await ethers.getContractFactory("Arbitration", client);
		arbitration = (await ArbitrationFactory.deploy(
			await trustLedger.getAddress(),
			await jurorRegistry.getAddress(),
		)) as unknown as Arbitration;
		await arbitration.waitForDeployment();

		// Confirm the address prediction was accurate.
		expect(await arbitration.getAddress()).to.equal(arbitrationAddr);
	}

	// `beforeEach` is Mocha's equivalent of Foundry's setUp(): runs before every `it()`.
	// This ensures every test starts with freshly deployed contracts and no residual state.
	beforeEach(async function () {
		await deployContracts();
	});

	// ─── Helper Functions ────────────────────────────────────────────────────
	// These reduce repetition in tests — each helper sets the contract up to a
	// certain point in the lifecycle so tests can focus on what they're testing.

	// Creates an escrow contract. `opts` is optional — callers can override specific fields.
	async function createContract(opts?: {
		holdBackBps?: number;
		warrantyPeriod?: bigint;
		amount?: bigint;
	}) {
		const holdBack = opts?.holdBackBps ?? 0; // `??` = nullish coalescing (default if null/undefined)
		const warranty = opts?.warrantyPeriod ?? 0n;
		const amount = opts?.amount ?? AMOUNT;

		// `.connect(signer)` sends the transaction as that signer.
		// `{ value: amount }` sends ETH with the call.
		const tx = await trustLedger
			.connect(client)
			.createContract(
				await freelancer.getAddress(),
				CONTRACT_HASH,
				"ipfs://QmContract",
				ESTIMATED_DURATION,
				BUFFER_FACTOR,
				ACCEPTANCE_WINDOW,
				ARB_FEE_BPS,
				holdBack,
				warranty,
				{ value: amount },
			);

		// `tx.wait()` waits for the transaction to be mined and returns the receipt.
		// The receipt contains the logs (events) emitted by the transaction.
		const receipt = await tx.wait();

		// Parse all logs to find the ContractCreated event, then extract the contract ID.
		const event = receipt?.logs
			.map((log) => {
				try {
					// `interface.parseLog` decodes a raw log entry using the contract's ABI.
					return trustLedger.interface.parseLog(log);
				} catch {
					return null; // logs from other contracts (e.g. OpenZeppelin) won't parse
				}
			})
			.find((e) => e?.name === "ContractCreated");

		// Return the first argument (id) from the event, typed as BigInt.
		return event?.args[0] as bigint;
	}

	// Creates a contract AND has the freelancer accept it.
	async function createAndAccept(opts?: Parameters<typeof createContract>[0]) {
		const id = await createContract(opts);
		await trustLedger.connect(freelancer).acceptContract(id);
		return id;
	}

	// Creates, accepts, and submits proof of work.
	async function createAcceptAndSubmit(opts?: Parameters<typeof createContract>[0]) {
		const id = await createAndAccept(opts);
		await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");
		return id;
	}

	// ─── Deployment ───────────────────────────────────────────────────────────

	describe("Deployment", function () {
		it("should deploy with correct addresses", async function () {
			// `properAddress` is a Chai matcher from hardhat-chai-matchers:
			// it checks the value looks like a valid 20-byte Ethereum address.
			expect(await trustLedger.getAddress()).to.be.properAddress;
			expect(await arbitration.getAddress()).to.be.properAddress;
			expect(await jurorRegistry.getAddress()).to.be.properAddress;
		});

		it("should have correct immutable references", async function () {
			// Calling a public immutable's getter returns the stored address.
			// SCREAMING_SNAKE_CASE because we renamed them during the lint cleanup.
			expect(await trustLedger.ARBITRATION()).to.equal(await arbitration.getAddress());
			expect(await arbitration.TRUST_LEDGER()).to.equal(await trustLedger.getAddress());
			expect(await arbitration.JUROR_REGISTRY()).to.equal(await jurorRegistry.getAddress());
		});
	});

	// ─── Happy Path ───────────────────────────────────────────────────────────

	describe("Happy Path: Create → Accept → Submit → Approve", function () {
		it("should create a contract with correct parameters", async function () {
			const id = await createContract();
			// `getContract(id)` returns an EscrowContract struct; fields are accessible as properties.
			const c = await trustLedger.getContract(id);

			expect(c.client).to.equal(await client.getAddress());
			expect(c.freelancer).to.equal(await freelancer.getAddress());
			expect(c.amount).to.equal(AMOUNT);
			expect(c.status).to.equal(0); // 0 = Status.PENDING
			expect(c.contractHash).to.equal(CONTRACT_HASH);
		});

		it("should allow freelancer to accept", async function () {
			const id = await createContract();

			// `emit` checks that the transaction emitted a specific event with specific args.
			// This verifies the contract emitted ContractAccepted(id) after accepting.
			await expect(trustLedger.connect(freelancer).acceptContract(id))
				.to.emit(trustLedger, "ContractAccepted")
				.withArgs(id);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(1); // 1 = Status.ACTIVE
		});

		it("should allow freelancer to submit proof of work", async function () {
			const id = await createAndAccept();
			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW"),
			)
				.to.emit(trustLedger, "ProofSubmitted")
				.withArgs(id, POW_HASH, "ipfs://QmPoW");

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(2); // 2 = Status.SUBMITTED
			expect(c.proofOfWorkHash).to.equal(POW_HASH);
		});

		it("should pay freelancer on approval", async function () {
			const id = await createAcceptAndSubmit();
			const freelancerAddr = await freelancer.getAddress();

			// Read balance before approval (in wei as BigInt).
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			await expect(trustLedger.connect(client).approveWork(id))
				.to.emit(trustLedger, "WorkApproved")
				.withArgs(id);

			const balAfter = await ethers.provider.getBalance(freelancerAddr);

			// Freelancer receives exactly AMOUNT (no gas cost for them since client called approveWork).
			expect(balAfter - balBefore).to.equal(AMOUNT);
		});
	});

	// ─── Rejection ────────────────────────────────────────────────────────────

	describe("Rejection", function () {
		it("should refund client when freelancer rejects", async function () {
			const id = await createContract();
			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			await expect(trustLedger.connect(freelancer).rejectContract(id))
				.to.emit(trustLedger, "ContractRejected")
				.withArgs(id);

			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balAfter - balBefore).to.equal(AMOUNT);
		});

		it("should set status to CANCELLED after rejection", async function () {
			const id = await createContract();
			await trustLedger.connect(freelancer).rejectContract(id);
			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(6); // 6 = Status.CANCELLED
		});
	});

	// ─── Deadline Miss ────────────────────────────────────────────────────────

	describe("Deadline Miss", function () {
		it("should allow client to reclaim after deadline", async function () {
			const id = await createAndAccept();
			const c = await trustLedger.getContract(id);
			const deadline = c.projectDeadline; // uint64 → BigInt in TypeScript

			// Attempt before deadline — must revert.
			await expect(
				trustLedger.connect(client).claimAfterDeadlineMiss(id),
			).to.be.revertedWithCustomError(trustLedger, "DeadlineNotElapsed");

			// evm_setNextBlockTimestamp sets the timestamp of the NEXT block to be mined.
			// This is Hardhat's equivalent of Foundry's vm.warp().
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
			// evm_mine forces the EVM to mine a new block, applying the timestamp above.
			await ethers.provider.send("evm_mine", []);

			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			const tx = await trustLedger.connect(client).claimAfterDeadlineMiss(id);
			const receipt = await tx.wait();
			if (receipt === null) {
				throw new Error("transaction not mined");
			}

			// Account for gas cost: the client pays gas for this transaction, so their
			// balance increase will be (AMOUNT - gasUsed × gasPrice).
			const gasUsed = receipt.gasUsed * receipt.gasPrice;

			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balAfter - balBefore + gasUsed).to.equal(AMOUNT);
		});
	});

	// ─── Acceptance Window Auto-Release ───────────────────────────────────────

	describe("Acceptance Window Auto-Release", function () {
		it("should allow freelancer to claim after window elapses", async function () {
			const id = await createAcceptAndSubmit();
			const c = await trustLedger.getContract(id);
			const acceptanceDeadline = c.acceptanceDeadline;

			// Before window: should revert.
			await expect(
				trustLedger.connect(freelancer).claimAfterAcceptanceWindow(id),
			).to.be.revertedWithCustomError(trustLedger, "WindowNotElapsed");

			// Advance time past acceptance deadline.
			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(acceptanceDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);

			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			const tx = await trustLedger.connect(freelancer).claimAfterAcceptanceWindow(id);
			const receipt = await tx.wait();
			if (receipt === null) {
				throw new Error("transaction not mined");
			}
			const gasUsed = receipt.gasUsed * receipt.gasPrice;

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
			expect(balAfter - balBefore + gasUsed).to.equal(AMOUNT);
		});
	});

	// ─── Hold-back & Warranty ────────────────────────────────────────────────

	describe("Hold-back and Warranty", function () {
		it("should hold back correct amount on approval", async function () {
			const id = await createAcceptAndSubmit({
				holdBackBps: 1000, // 10%
				warrantyPeriod: 7n * 24n * 3600n, // 7 days
			});

			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			await trustLedger.connect(client).approveWork(id);

			const holdBack = (AMOUNT * 1000n) / 10000n; // 10% of 1 ETH = 0.1 ETH
			const payout = AMOUNT - holdBack; // immediate payout

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
			// Freelancer receives payout (client paid gas, not freelancer).
			expect(balAfter - balBefore).to.equal(payout);

			const c = await trustLedger.getContract(id);
			expect(c.holdBackAmount).to.equal(holdBack);
		});

		it("should release warranty funds after period", async function () {
			const warrantyPeriod = 7n * 24n * 3600n;
			const id = await createAcceptAndSubmit({ holdBackBps: 1000, warrantyPeriod });

			await trustLedger.connect(client).approveWork(id);

			const c = await trustLedger.getContract(id);
			const warrantyDeadline = c.warrantyDeadline;

			// Before warranty expires.
			await expect(
				trustLedger.connect(freelancer).claimWarrantyFunds(id),
			).to.be.revertedWithCustomError(trustLedger, "WindowNotElapsed");

			// Advance time past warranty deadline.
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(warrantyDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			const holdBack = (AMOUNT * 1000n) / 10000n;
			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			const tx = await trustLedger.connect(freelancer).claimWarrantyFunds(id);
			const receipt = await tx.wait();
			if (receipt === null) {
				throw new Error("transaction not mined");
			}
			const gasUsed = receipt.gasUsed * receipt.gasPrice;
			const balAfter = await ethers.provider.getBalance(freelancerAddr);

			expect(balAfter - balBefore + gasUsed).to.equal(holdBack);
		});
	});

	// ─── Dispute Flow ─────────────────────────────────────────────────────────

	describe("Dispute Flow", function () {
		it("should send fee pool to arbitration on dispute", async function () {
			const id = await createAcceptAndSubmit();
			const arbAddr = await arbitration.getAddress();

			// Capture Arbitration's ETH balance before the dispute.
			const arbBalBefore = await ethers.provider.getBalance(arbAddr);

			await expect(trustLedger.connect(client).disputeWork(id))
				.to.emit(trustLedger, "WorkDisputed")
				.withArgs(id, 0n); // first dispute has id = 0

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const arbBalAfter = await ethers.provider.getBalance(arbAddr);

			// Arbitration received exactly the fee pool.
			expect(arbBalAfter - arbBalBefore).to.equal(feePool);
		});

		it("should set status to DISPUTED after dispute", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(4); // 4 = Status.DISPUTED
		});

		it("should open dispute in arbitration contract", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			// Verify the dispute was recorded correctly in the Arbitration contract.
			const dispute = await arbitration.getDispute(0n); // disputeId = 0
			expect(dispute.contractId).to.equal(id);
			expect(dispute.client).to.equal(await client.getAddress());
			expect(dispute.freelancer).to.equal(await freelancer.getAddress());
		});
	});

	// ─── executeRuling (called by Arbitration) ────────────────────────────────
	// In production, Arbitration calls TrustLedger.executeRuling() after jurors vote.
	// In tests, we use `ethers.getImpersonatedSigner` to pretend we ARE the Arbitration
	// contract, bypassing the `onlyArbitration` check so we can test payout math directly.

	describe("executeRuling", function () {
		// Helper: set up an impersonated Arbitration signer with enough ETH for gas.
		async function getArbSigner() {
			// hardhat_impersonateAccount tells the local Hardhat node to accept transactions
			// "from" any address, even if we don't hold the private key.
			const arbSigner = await ethers.getImpersonatedSigner(await arbitration.getAddress());

			// The Arbitration contract address has no ETH by default. Give it some for gas.
			// hardhat_setBalance sets an account's balance directly (balance cheat code).
			// "0x56BC75E2D630FFFFF" is a large hex ETH value.
			await ethers.provider.send("hardhat_setBalance", [
				await arbitration.getAddress(),
				"0x56BC75E2D630FFFFF",
			]);
			return arbSigner;
		}

		it("should distribute 0% to client", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const remaining = AMOUNT - feePool;

			const arbSigner = await getArbSigner();
			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			// Call executeRuling as if we're Arbitration (completionPct = 0 → client wins all).
			await trustLedger.connect(arbSigner).executeRuling(id, 0n);

			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balAfter - balBefore).to.equal(remaining);
		});

		it("should distribute 100% to freelancer", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const remaining = AMOUNT - feePool;

			const arbSigner = await getArbSigner();
			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			// completionPct = 100 → freelancer wins all remaining.
			await trustLedger.connect(arbSigner).executeRuling(id, 100n);

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
			expect(balAfter - balBefore).to.equal(remaining);
		});

		it("should split 50% correctly", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const remaining = AMOUNT - feePool;

			// Formula at 50%: freelancerPay = (2 × 50 × AMOUNT) / 300
			const expectedFreelancerPay = (2n * 50n * AMOUNT) / 300n;
			const expectedClientRefund = remaining - expectedFreelancerPay;

			const arbSigner = await getArbSigner();
			const freelancerAddr = await freelancer.getAddress();
			const clientAddr = await client.getAddress();
			const freelancerBefore = await ethers.provider.getBalance(freelancerAddr);
			const clientBefore = await ethers.provider.getBalance(clientAddr);

			await trustLedger.connect(arbSigner).executeRuling(id, 50n);

			const freelancerAfter = await ethers.provider.getBalance(freelancerAddr);
			const clientAfter = await ethers.provider.getBalance(clientAddr);

			expect(freelancerAfter - freelancerBefore).to.equal(expectedFreelancerPay);
			expect(clientAfter - clientBefore).to.equal(expectedClientRefund);
			expect(expectedFreelancerPay + expectedClientRefund).to.equal(remaining);
		});
	});

	// ─── Revert Cases ────────────────────────────────────────────────────────
	// Each test verifies that one specific guard rejects an invalid call.
	// `revertedWithCustomError(contract, errorName)` is a Chai matcher from
	// hardhat-chai-matchers that checks for Solidity custom errors by name.

	describe("Revert Cases", function () {
		it("should revert createContract with zero address freelancer", async function () {
			await expect(
				trustLedger.connect(client).createContract(
					ethers.ZeroAddress, // address(0) — the zero address
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					{ value: AMOUNT },
				),
			).to.be.revertedWithCustomError(trustLedger, "ZeroAddress");
		});

		it("should revert createContract with self as freelancer", async function () {
			await expect(
				trustLedger.connect(client).createContract(
					await client.getAddress(), // client hiring themselves
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					{ value: AMOUNT },
				),
			).to.be.revertedWithCustomError(trustLedger, "SelfContract");
		});

		it("should revert createContract with 0 value", async function () {
			await expect(
				trustLedger.connect(client).createContract(
					await freelancer.getAddress(),
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					{ value: 0 }, // no ETH sent
				),
			).to.be.revertedWithCustomError(trustLedger, "InsufficientFunds");
		});

		it("should revert acceptContract when not freelancer", async function () {
			const id = await createContract();
			await expect(
				trustLedger.connect(stranger).acceptContract(id), // wrong caller
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert approveWork when not client", async function () {
			const id = await createAcceptAndSubmit();
			await expect(
				trustLedger.connect(stranger).approveWork(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert approveWork after acceptance window", async function () {
			const id = await createAcceptAndSubmit();
			const c = await trustLedger.getContract(id);

			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(c.acceptanceDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);

			await expect(trustLedger.connect(client).approveWork(id)).to.be.revertedWithCustomError(
				trustLedger,
				"WindowElapsed",
			);
		});

		it("should revert executeRuling when not arbitration", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			await expect(
				trustLedger.connect(stranger).executeRuling(id, 50n), // not Arbitration
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert executeRuling with completionPct > 100", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const arbSigner = await ethers.getImpersonatedSigner(await arbitration.getAddress());
			await ethers.provider.send("hardhat_setBalance", [
				await arbitration.getAddress(),
				"0x56BC75E2D630FFFFF",
			]);

			await expect(
				trustLedger.connect(arbSigner).executeRuling(id, 101n), // > 100 is invalid
			).to.be.revertedWithCustomError(trustLedger, "CompletionPctOutOfRange");
		});

		it("should revert submitProofOfWork after deadline", async function () {
			const id = await createAndAccept();
			const c = await trustLedger.getContract(id);

			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(c.projectDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);

			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://"),
			).to.be.revertedWithCustomError(trustLedger, "DeadlineElapsed");
		});

		it("should revert invalid buffer factor", async function () {
			await expect(
				trustLedger.connect(client).createContract(
					await freelancer.getAddress(),
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					1000n, // 1.0× buffer — below the 1.1× minimum
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					{ value: AMOUNT },
				),
			).to.be.revertedWithCustomError(trustLedger, "InvalidBufferFactor");
		});

		it("should revert invalid acceptance window", async function () {
			await expect(
				trustLedger.connect(client).createContract(
					await freelancer.getAddress(),
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					3600n, // 1 hour — below the 48-hour minimum
					ARB_FEE_BPS,
					0,
					0,
					{ value: AMOUNT },
				),
			).to.be.revertedWithCustomError(trustLedger, "InvalidAcceptanceWindow");
		});
	});

	// ─── nextId ───────────────────────────────────────────────────────────────

	describe("nextId", function () {
		it("should increment after each created contract", async function () {
			// nextId is a public state variable — calling it returns the current value.
			expect(await trustLedger.nextId()).to.equal(0n); // starts at 0
			await createContract();
			expect(await trustLedger.nextId()).to.equal(1n);
			await createContract();
			expect(await trustLedger.nextId()).to.equal(2n);
		});
	});
});
