// test/TrustLedger.test.ts - Hardhat/Mocha/Chai test suite for TrustLedger.
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
//   - the freelancer proposes (proposeContract); the client accepts by funding the escrow

import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

import type {
	TrustLedger,
	JurorRegistry,
	Arbitration,
	ReputationRegistry,
	MockERC20,
	MockVRFCoordinator,
	MockPriceFeed,
} from "../artifacts/typechain-types";

describe("TrustLedger", function () {
	let trustLedger: TrustLedger;
	let jurorRegistry: JurorRegistry;
	let arbitration: Arbitration;
	let client: Signer;
	let freelancer: Signer;
	let stranger: Signer;

	// ── Constants ──────────────────────────────────────────────────────────────
	const AMOUNT = ethers.parseEther("1");
	const ESTIMATED_DURATION = 30n * 24n * 3600n;
	const BUFFER_FACTOR = 1200n;
	const ACCEPTANCE_WINDOW = 48n * 3600n;
	const ARB_FEE_BPS = 1000;

	const CONTRACT_HASH = ethers.keccak256(ethers.toUtf8Bytes("contract-doc"));
	const POW_HASH = ethers.keccak256(ethers.toUtf8Bytes("proof-of-work"));

	const STATUS = {
		PENDING: 0,
		ACTIVE: 1,
		SUBMITTED: 2,
		APPROVED: 3,
		DISPUTED: 4,
		RESOLVED: 5,
		CANCELLED: 6,
	} as const;

	// ── deployContracts ────────────────────────────────────────────────────────
	async function deployContracts() {
		const signers = await ethers.getSigners();
		client = signers[0];
		freelancer = signers[1];
		stranger = signers[2];

		const clientAddr = await client.getAddress();

		const nonce = await ethers.provider.getTransactionCount(clientAddr);

		// Arbitration will be deployed at nonce+2 from the client's address.
		const arbitrationAddr = ethers.getCreateAddress({
			from: clientAddr,
			nonce: nonce + 2,
		});

		const JurorRegistryFactory = await ethers.getContractFactory("JurorRegistry", client);
		jurorRegistry = (await JurorRegistryFactory.deploy(
			arbitrationAddr,
		)) as unknown as JurorRegistry;
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

		expect(await arbitration.getAddress()).to.equal(arbitrationAddr);
	}

	beforeEach(async function () {
		await deployContracts();
	});

	// ─── Helper Functions ────────────────────────────────────────────────────

	// Freelancer proposes an escrow contract with optional overrides. No funds move yet;
	// the contract sits PENDING until the client accepts. Passes address(0) for the token
	// param (ETH escrow); the escrow amount is a parameter the client will lock on acceptance.
	async function createContract(opts?: {
		holdBackBps?: number;
		warrantyPeriod?: bigint;
		amount?: bigint;
	}) {
		const holdBack = opts?.holdBackBps ?? 0;
		const warranty = opts?.warrantyPeriod ?? 0n;
		const amount = opts?.amount ?? AMOUNT;

		const tx = await trustLedger.connect(freelancer).proposeContract(
			await client.getAddress(),
			CONTRACT_HASH,
			"ipfs://QmContract",
			ESTIMATED_DURATION,
			BUFFER_FACTOR,
			ACCEPTANCE_WINDOW,
			ARB_FEE_BPS,
			holdBack,
			warranty,
			ethers.ZeroAddress, // token = address(0) → ETH escrow
			amount, // escrow amount the client will lock
		);

		const receipt = await tx.wait();

		const event = receipt?.logs
			.map((log) => {
				try {
					return trustLedger.interface.parseLog(log);
				} catch {
					return null;
				}
			})
			.find((e) => e?.name === "ContractProposed");

		return event?.args[0] as bigint;
	}

	// Proposes a contract AND has the client accept it, funding the escrow.
	async function createAndAccept(opts?: Parameters<typeof createContract>[0]) {
		const id = await createContract(opts);
		const amount = opts?.amount ?? AMOUNT;
		await trustLedger.connect(client).acceptContract(id, { value: amount });
		return id;
	}

	// Creates, accepts, and submits proof of work.
	async function createAcceptAndSubmit(opts?: Parameters<typeof createContract>[0]) {
		const id = await createAndAccept(opts);
		await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");
		return id;
	}

	// Returns an impersonated signer with a funded ETH balance for the given address.
	async function impersonate(addr: string) {
		await ethers.provider.send("hardhat_setBalance", [addr, "0x56BC75E2D630FFFFF"]);
		return await ethers.getImpersonatedSigner(addr);
	}

	// Builds a commit-reveal commitment hash for a juror vote.
	function makeCommitment(disputeId: bigint, juror: string, pct: number, salt: string): string {
		return ethers.solidityPackedKeccak256(
			["uint256", "address", "uint256", "bytes32"],
			[disputeId, juror, pct, ethers.encodeBytes32String(salt)],
		);
	}

	// ─── Deployment ───────────────────────────────────────────────────────────

	describe("Deployment", function () {
		it("should deploy with correct addresses", async function () {
			expect(await trustLedger.getAddress()).to.be.properAddress;
			expect(await arbitration.getAddress()).to.be.properAddress;
			expect(await jurorRegistry.getAddress()).to.be.properAddress;
		});

		it("should have correct immutable references", async function () {
			expect(await trustLedger.ARBITRATION()).to.equal(await arbitration.getAddress());
			expect(await arbitration.TRUST_LEDGER()).to.equal(await trustLedger.getAddress());
			expect(await arbitration.JUROR_REGISTRY()).to.equal(await jurorRegistry.getAddress());
		});
	});

	// ─── Happy Path ───────────────────────────────────────────────────────────

	describe("Happy Path: Create → Accept → Submit → Approve", function () {
		it("should create a contract with correct parameters", async function () {
			const id = await createContract();
			const c = await trustLedger.getContract(id);

			expect(c.client).to.equal(await client.getAddress());
			expect(c.freelancer).to.equal(await freelancer.getAddress());
			expect(c.amount).to.equal(AMOUNT);
			expect(c.status).to.equal(STATUS.PENDING);
			expect(c.contractHash).to.equal(CONTRACT_HASH);
			expect(c.token).to.equal(ethers.ZeroAddress); // ETH escrow
		});

		it("should allow client to accept by funding the escrow", async function () {
			const id = await createContract();

			// `emit` checks that the transaction emitted ContractAccepted(id).
			await expect(trustLedger.connect(client).acceptContract(id, { value: AMOUNT }))
				.to.emit(trustLedger, "ContractAccepted")
				.withArgs(id);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.ACTIVE);
			// Funds are now held by the escrow contract.
			expect(await ethers.provider.getBalance(await trustLedger.getAddress())).to.equal(
				AMOUNT,
			);
		});

		it("should allow freelancer to submit proof of work", async function () {
			const id = await createAndAccept();
			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW"),
			)
				.to.emit(trustLedger, "ProofSubmitted")
				.withArgs(id, POW_HASH, "ipfs://QmPoW");

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.SUBMITTED);
			expect(c.proofOfWorkHash).to.equal(POW_HASH);
		});

		it("should pay freelancer on approval", async function () {
			const id = await createAcceptAndSubmit();
			const freelancerAddr = await freelancer.getAddress();

			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			await expect(trustLedger.connect(client).approveWork(id))
				.to.emit(trustLedger, "WorkApproved")
				.withArgs(id);

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
			expect(balAfter - balBefore).to.equal(AMOUNT);
		});
	});

	// ─── Cancel Proposal ────────────────────────────────────────────────────────

	describe("Cancel Proposal", function () {
		it("should let the freelancer withdraw a pending proposal without moving funds", async function () {
			const id = await createContract();
			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			await expect(trustLedger.connect(freelancer).cancelProposal(id))
				.to.emit(trustLedger, "ContractCancelled")
				.withArgs(id);

			// No funds were ever held, so the client's balance is unchanged.
			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balAfter).to.equal(balBefore);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.CANCELLED);
		});
	});

	// ─── Rejection ────────────────────────────────────────────────────────────

	describe("Rejection", function () {
		it("should let the client reject a proposal without moving funds", async function () {
			const id = await createContract();
			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			const tx = await trustLedger.connect(client).rejectContract(id);
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("transaction not mined");
			const gasUsed = receipt.gasUsed * receipt.gasPrice;

			await expect(tx).to.emit(trustLedger, "ContractRejected").withArgs(id);

			// No escrow was held; the only balance delta is the rejection gas.
			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balBefore - balAfter).to.equal(gasUsed);
		});

		it("should set status to CANCELLED after rejection", async function () {
			const id = await createContract();
			await trustLedger.connect(client).rejectContract(id);
			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.CANCELLED);
		});
	});

	// ─── Deadline Miss ────────────────────────────────────────────────────────

	describe("Deadline Miss", function () {
		it("should allow client to reclaim after deadline", async function () {
			const id = await createAndAccept();
			const c = await trustLedger.getContract(id);
			const deadline = c.projectDeadline;

			await expect(
				trustLedger.connect(client).claimAfterDeadlineMiss(id),
			).to.be.revertedWithCustomError(trustLedger, "DeadlineNotElapsed");

			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			const tx = await trustLedger.connect(client).claimAfterDeadlineMiss(id);
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("transaction not mined");
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

			await expect(
				trustLedger.connect(freelancer).claimAfterAcceptanceWindow(id),
			).to.be.revertedWithCustomError(trustLedger, "WindowNotElapsed");

			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(acceptanceDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);

			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			const tx = await trustLedger.connect(freelancer).claimAfterAcceptanceWindow(id);
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("transaction not mined");
			const gasUsed = receipt.gasUsed * receipt.gasPrice;

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
			expect(balAfter - balBefore + gasUsed).to.equal(AMOUNT);
		});
	});

	// ─── Hold-back & Warranty ────────────────────────────────────────────────

	describe("Hold-back and Warranty", function () {
		it("should hold back correct amount on approval", async function () {
			const id = await createAcceptAndSubmit({
				holdBackBps: 1000,
				warrantyPeriod: 7n * 24n * 3600n,
			});

			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			await trustLedger.connect(client).approveWork(id);

			const holdBack = (AMOUNT * 1000n) / 10000n;
			const payout = AMOUNT - holdBack;

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
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

			await expect(
				trustLedger.connect(freelancer).claimWarrantyFunds(id),
			).to.be.revertedWithCustomError(trustLedger, "WindowNotElapsed");

			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(warrantyDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			const holdBack = (AMOUNT * 1000n) / 10000n;
			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			const tx = await trustLedger.connect(freelancer).claimWarrantyFunds(id);
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("transaction not mined");
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

			const arbBalBefore = await ethers.provider.getBalance(arbAddr);

			await expect(trustLedger.connect(client).disputeWork(id))
				.to.emit(trustLedger, "WorkDisputed")
				.withArgs(id, 0n);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const arbBalAfter = await ethers.provider.getBalance(arbAddr);

			expect(arbBalAfter - arbBalBefore).to.equal(feePool);
		});

		it("should set status to DISPUTED after dispute", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.DISPUTED);
		});

		it("should open dispute in arbitration contract", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const dispute = await arbitration.getDispute(0n);
			expect(dispute.contractId).to.equal(id);
			expect(dispute.client).to.equal(await client.getAddress());
			expect(dispute.freelancer).to.equal(await freelancer.getAddress());
		});
	});

	// ─── executeRuling ────────────────────────────────────────────────────────

	describe("executeRuling", function () {
		it("should distribute 0% to client", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const remaining = AMOUNT - feePool;

			const arbSigner = await impersonate(await arbitration.getAddress());
			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			await trustLedger.connect(arbSigner).executeRuling(id, 0n);

			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balAfter - balBefore).to.equal(remaining);
		});

		it("should distribute 100% to freelancer", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const remaining = AMOUNT - feePool;

			const arbSigner = await impersonate(await arbitration.getAddress());
			const freelancerAddr = await freelancer.getAddress();
			const balBefore = await ethers.provider.getBalance(freelancerAddr);

			await trustLedger.connect(arbSigner).executeRuling(id, 100n);

			const balAfter = await ethers.provider.getBalance(freelancerAddr);
			expect(balAfter - balBefore).to.equal(remaining);
		});

		it("should split 50% correctly using the proportional formula", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const feePool = (AMOUNT * BigInt(ARB_FEE_BPS)) / 10000n;
			const remaining = AMOUNT - feePool;

			// New proportional formula (Part 1):
			//   rawPay              = (2 × 50 × AMOUNT) / 300
			//   freelancerFeeBurden = (feePool × 50) / 100
			//   freelancerPay       = rawPay - freelancerFeeBurden
			const rawPay = (2n * 50n * AMOUNT) / 300n;
			const freelancerFeeBurden = (feePool * 50n) / 100n;
			const expectedFreelancerPay = rawPay - freelancerFeeBurden;
			const expectedClientRefund = remaining - expectedFreelancerPay;

			const arbSigner = await impersonate(await arbitration.getAddress());
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

	describe("Revert Cases", function () {
		it("should revert proposeContract with zero address client", async function () {
			await expect(
				trustLedger
					.connect(freelancer)
					.proposeContract(
						ethers.ZeroAddress,
						CONTRACT_HASH,
						"ipfs://",
						ESTIMATED_DURATION,
						BUFFER_FACTOR,
						ACCEPTANCE_WINDOW,
						ARB_FEE_BPS,
						0,
						0,
						ethers.ZeroAddress,
						AMOUNT,
					),
			).to.be.revertedWithCustomError(trustLedger, "InvalidClientAddress");
		});

		it("should revert proposeContract with self as client", async function () {
			await expect(
				trustLedger
					.connect(freelancer)
					.proposeContract(
						await freelancer.getAddress(),
						CONTRACT_HASH,
						"ipfs://",
						ESTIMATED_DURATION,
						BUFFER_FACTOR,
						ACCEPTANCE_WINDOW,
						ARB_FEE_BPS,
						0,
						0,
						ethers.ZeroAddress,
						AMOUNT,
					),
			).to.be.revertedWithCustomError(trustLedger, "ClientIsCaller");
		});

		it("should revert proposeContract with 0 amount", async function () {
			await expect(
				trustLedger
					.connect(freelancer)
					.proposeContract(
						await client.getAddress(),
						CONTRACT_HASH,
						"ipfs://",
						ESTIMATED_DURATION,
						BUFFER_FACTOR,
						ACCEPTANCE_WINDOW,
						ARB_FEE_BPS,
						0,
						0,
						ethers.ZeroAddress,
						0n,
					),
			).to.be.revertedWithCustomError(trustLedger, "ProposalAmountZero");
		});

		it("should revert acceptContract when not client", async function () {
			const id = await createContract();
			// Caller is stranger (not the client) → Unauthorized.
			await expect(
				trustLedger.connect(stranger).acceptContract(id, { value: AMOUNT }),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert acceptContract with wrong value", async function () {
			const id = await createContract();
			// Funding with less than the proposed amount is rejected.
			await expect(
				trustLedger.connect(client).acceptContract(id, { value: AMOUNT - 1n }),
			).to.be.revertedWithCustomError(trustLedger, "InsufficientFunds");
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

		it("should revert client rejection after the proposal is already funded", async function () {
			const id = await createAndAccept();

			await expect(
				trustLedger.connect(client).rejectContract(id),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert freelancer cancellation after the proposal is already funded", async function () {
			const id = await createAndAccept();

			await expect(
				trustLedger.connect(freelancer).cancelProposal(id),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert duplicate proof submission while already submitted", async function () {
			const id = await createAcceptAndSubmit();

			await expect(
				trustLedger
					.connect(freelancer)
					.submitProofOfWork(id, POW_HASH, "ipfs://QmSecondPoW"),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert executeRuling when not arbitration", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			await expect(
				trustLedger.connect(stranger).executeRuling(id, 50n),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert executeRuling with completionPct > 100", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const arbSigner = await impersonate(await arbitration.getAddress());

			await expect(
				trustLedger.connect(arbSigner).executeRuling(id, 101n),
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
				trustLedger
					.connect(freelancer)
					.proposeContract(
						await client.getAddress(),
						CONTRACT_HASH,
						"ipfs://",
						ESTIMATED_DURATION,
						1000n,
						ACCEPTANCE_WINDOW,
						ARB_FEE_BPS,
						0,
						0,
						ethers.ZeroAddress,
						AMOUNT,
					),
			).to.be.revertedWithCustomError(trustLedger, "InvalidBufferFactor");
		});

		it("should revert invalid acceptance window", async function () {
			await expect(
				trustLedger
					.connect(freelancer)
					.proposeContract(
						await client.getAddress(),
						CONTRACT_HASH,
						"ipfs://",
						ESTIMATED_DURATION,
						BUFFER_FACTOR,
						3600n,
						ARB_FEE_BPS,
						0,
						0,
						ethers.ZeroAddress,
						AMOUNT,
					),
			).to.be.revertedWithCustomError(trustLedger, "InvalidAcceptanceWindow");
		});
	});

	// ─── nextId ───────────────────────────────────────────────────────────────

	describe("nextId", function () {
		it("should increment after each created contract", async function () {
			expect(await trustLedger.nextId()).to.equal(0n);
			await createContract();
			expect(await trustLedger.nextId()).to.equal(1n);
			await createContract();
			expect(await trustLedger.nextId()).to.equal(2n);
		});
	});

	// ─── ERC-20 Escrow ────────────────────────────────────────────────────────
	// Deploys MockERC20 and repeats key lifecycle paths (create, approve, reject,
	// cancel, warranty, dispute, ruling) using token escrow instead of ETH.
	// Verifies that TrustLedger's _sendFunds() correctly routes to IERC20.transfer
	// and that disputes require an explicit ETH fee pool sent as msg.value.

	describe("ERC-20 Escrow", function () {
		let token: MockERC20;
		const TOKEN_AMOUNT = ethers.parseUnits("100", 18);

		beforeEach(async function () {
			const MockERC20Factory = await ethers.getContractFactory("MockERC20", client);
			token = (await MockERC20Factory.deploy()) as unknown as MockERC20;
			await token.waitForDeployment();

			// Whitelist the mock token, then mint to client and approve TrustLedger
			await trustLedger.connect(client).addAllowedToken(await token.getAddress());
			await token.mint(await client.getAddress(), TOKEN_AMOUNT * 10n);
			await token.connect(client).approve(await trustLedger.getAddress(), TOKEN_AMOUNT * 10n);
		});

		// Freelancer proposes a token escrow (no tokens move yet).
		async function createERC20Contract(opts?: {
			holdBackBps?: number;
			warrantyPeriod?: bigint;
		}) {
			const holdBack = opts?.holdBackBps ?? 0;
			const warranty = opts?.warrantyPeriod ?? 0n;

			const tx = await trustLedger
				.connect(freelancer)
				.proposeContract(
					await client.getAddress(),
					CONTRACT_HASH,
					"ipfs://QmContract",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					holdBack,
					warranty,
					await token.getAddress(),
					TOKEN_AMOUNT,
				);
			const receipt = await tx.wait();
			const event = receipt?.logs
				.map((log) => {
					try {
						return trustLedger.interface.parseLog(log);
					} catch {
						return null;
					}
				})
				.find((e) => e?.name === "ContractProposed");
			return event?.args[0] as bigint;
		}

		// Client accepts a token escrow, pulling TOKEN_AMOUNT via transferFrom (no ETH value).
		async function acceptERC20(id: bigint) {
			await trustLedger.connect(client).acceptContract(id);
		}

		it("should pull tokens from client on acceptContract", async function () {
			const contractAddr = await trustLedger.getAddress();
			const before = await token.balanceOf(contractAddr);

			const id = await createERC20Contract();
			// Tokens are only pulled when the client accepts and funds.
			expect((await token.balanceOf(contractAddr)) - before).to.equal(0n);
			await acceptERC20(id);

			expect((await token.balanceOf(contractAddr)) - before).to.equal(TOKEN_AMOUNT);
			const c = await trustLedger.getContract(id);
			expect(c.token).to.equal(await token.getAddress());
			expect(c.amount).to.equal(TOKEN_AMOUNT);
		});

		it("should pay freelancer in tokens on approval", async function () {
			const id = await createERC20Contract();
			await acceptERC20(id);
			await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");

			const freelancerAddr = await freelancer.getAddress();
			const before = await token.balanceOf(freelancerAddr);
			await trustLedger.connect(client).approveWork(id);
			expect((await token.balanceOf(freelancerAddr)) - before).to.equal(TOKEN_AMOUNT);
		});

		it("should not move tokens when the client rejects an unfunded proposal", async function () {
			const id = await createERC20Contract();
			const clientAddr = await client.getAddress();
			const before = await token.balanceOf(clientAddr);
			await trustLedger.connect(client).rejectContract(id);
			expect(await token.balanceOf(clientAddr)).to.equal(before);
		});

		it("should not move tokens when the freelancer withdraws a proposal", async function () {
			const id = await createERC20Contract();
			const clientAddr = await client.getAddress();
			const before = await token.balanceOf(clientAddr);
			await trustLedger.connect(freelancer).cancelProposal(id);
			expect(await token.balanceOf(clientAddr)).to.equal(before);
		});

		it("should hold back tokens correctly on approval with warranty", async function () {
			const id = await createERC20Contract({
				holdBackBps: 1000,
				warrantyPeriod: 7n * 24n * 3600n,
			});
			await acceptERC20(id);
			await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");

			const freelancerAddr = await freelancer.getAddress();
			const before = await token.balanceOf(freelancerAddr);
			await trustLedger.connect(client).approveWork(id);

			const holdBack = (TOKEN_AMOUNT * 1000n) / 10000n;
			const payout = TOKEN_AMOUNT - holdBack;
			expect((await token.balanceOf(freelancerAddr)) - before).to.equal(payout);

			const c = await trustLedger.getContract(id);
			const warrantyDeadline = c.warrantyDeadline;
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(warrantyDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			const before2 = await token.balanceOf(freelancerAddr);
			await trustLedger.connect(freelancer).claimWarrantyFunds(id);
			expect((await token.balanceOf(freelancerAddr)) - before2).to.equal(holdBack);
		});

		it("should require ETH fee pool for ERC-20 escrow dispute", async function () {
			const id = await createERC20Contract();
			await acceptERC20(id);
			await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");

			// No ETH → revert InsufficientFunds
			await expect(
				trustLedger.connect(client).disputeWork(id, { value: 0n }),
			).to.be.revertedWithCustomError(trustLedger, "InsufficientFunds");

			// With ETH fee pool → success
			const feePool = ethers.parseEther("0.1");
			await expect(trustLedger.connect(client).disputeWork(id, { value: feePool })).to.emit(
				trustLedger,
				"WorkDisputed",
			);
		});

		it("should distribute tokens on ruling for ERC-20 escrow", async function () {
			const id = await createERC20Contract();
			await acceptERC20(id);
			await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");

			const feePool = ethers.parseEther("0.1");
			await trustLedger.connect(client).disputeWork(id, { value: feePool });

			const arbSigner = await impersonate(await arbitration.getAddress());

			const freelancerAddr = await freelancer.getAddress();
			const before = await token.balanceOf(freelancerAddr);
			await trustLedger.connect(arbSigner).executeRuling(id, 100n);
			expect((await token.balanceOf(freelancerAddr)) - before).to.equal(TOKEN_AMOUNT);
		});

		it("should revert acceptContract when ETH sent with token escrow", async function () {
			const id = await createERC20Contract();
			// A token escrow is funded via transferFrom; sending ETH on accept is rejected.
			await expect(
				trustLedger.connect(client).acceptContract(id, { value: ethers.parseEther("1") }),
			).to.be.revertedWithCustomError(trustLedger, "InvalidTokenParams");
		});
	});

	// ─── Chainlink Price Feed Mock ────────────────────────────────────────────
	// Wires MockPriceFeed into TrustLedger via initPriceFeed() and verifies that
	// usdValueAtCreation is stored correctly at contract creation, returns 0 when
	// the feed price is non-positive, and that the one-time setter reverts on a
	// second call.

	describe("Chainlink Price Feed Mock", function () {
		let priceFeed: MockPriceFeed;
		const ETH_PRICE_USD = 3000_0000_0000n; // $3000 with 8 decimals

		beforeEach(async function () {
			const PriceFeedFactory = await ethers.getContractFactory("MockPriceFeed", client);
			priceFeed = (await PriceFeedFactory.deploy(ETH_PRICE_USD)) as unknown as MockPriceFeed;
			await priceFeed.waitForDeployment();
			await trustLedger.connect(client).initPriceFeed(await priceFeed.getAddress());
		});

		it("should record usdValueAtCreation when price feed is set", async function () {
			// The USD value is locked when the client accepts and funds the escrow.
			const id = await createAndAccept();
			const c = await trustLedger.getContract(id);
			// usdValueAtCreation = (1 ETH × 3000e8) / 1e18 = 3000e8 / 1e10 = 300000
			const expected = (AMOUNT * ETH_PRICE_USD) / 10n ** 18n;
			expect(c.usdValueAtCreation).to.equal(expected);
		});

		it("should store usdValueAtCreation = 0 when price feed returns ≤ 0", async function () {
			await priceFeed.setPrice(0);
			const id = await createAndAccept();
			const c = await trustLedger.getContract(id);
			expect(c.usdValueAtCreation).to.equal(0n);
		});

		it("should revert initPriceFeed if called twice", async function () {
			await expect(
				trustLedger.connect(client).initPriceFeed(await priceFeed.getAddress()),
			).to.be.revertedWithCustomError(trustLedger, "AlreadySet");
		});
	});

	// ─── VRF Mock ─────────────────────────────────────────────────────────────
	// Wires MockVRFCoordinator into Arbitration via initVrfCoordinator() and
	// verifies the full VRF path: dispute open triggers requestRandomWords(),
	// fulfillWithWords() pre-selects jurors, and non-selected addresses are
	// rejected from commitVote() once vrfFulfilled flips to true.

	describe("VRF Mock (juror pre-selection)", function () {
		let vrf: MockVRFCoordinator;
		let jurors: Signer[];

		beforeEach(async function () {
			const VRFFactory = await ethers.getContractFactory("MockVRFCoordinator", client);
			vrf = (await VRFFactory.deploy()) as unknown as MockVRFCoordinator;
			await vrf.waitForDeployment();

			await arbitration.connect(client).initVrfCoordinator(await vrf.getAddress());

			// Register enough jurors (signers 3-7)
			const allSigners = await ethers.getSigners();
			jurors = allSigners.slice(3, 8);
			for (const j of jurors) {
				await jurorRegistry.connect(j).register({ value: ethers.parseEther("0.1") });
			}
			// Warp past the 7-day lock period so jurors are eligible
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);
		});

		it("should request VRF randomness when dispute is opened", async function () {
			const id = await createAcceptAndSubmit();
			const requestIdBefore = await vrf.lastRequestId();
			await trustLedger.connect(client).disputeWork(id);
			expect(await vrf.lastRequestId()).to.be.gt(requestIdBefore);
		});

		it("should pre-select jurors via fulfillRandomWords", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			const requestId = await vrf.lastRequestId();
			// Provide 5 random words, each pointing at a different juror index
			const randomWords = [0n, 1n, 2n, 3n, 4n];
			await vrf.fulfillWithWords(await arbitration.getAddress(), requestId, randomWords);

			const dispute = await arbitration.getDispute(disputeId);
			expect(dispute.vrfFulfilled).to.equal(true);
			expect(dispute.jurorCount).to.be.gte(1n);
		});

		it("should reject non-VRF juror commitments after VRF fulfillment", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const requestId = await vrf.lastRequestId();
			await vrf.fulfillWithWords(await arbitration.getAddress(), requestId, [
				0n,
				1n,
				2n,
				3n,
				4n,
			]);

			// stranger (signers[2]) was not pre-selected - must revert
			const commitment = ethers.keccak256(ethers.toUtf8Bytes("fake"));
			await expect(
				arbitration.connect(stranger).commitVote(0n, commitment),
			).to.be.revertedWithCustomError(arbitration, "NotEligible");
		});

		it("should revert initVrfCoordinator if called twice", async function () {
			await expect(
				arbitration.connect(client).initVrfCoordinator(await vrf.getAddress()),
			).to.be.revertedWithCustomError(arbitration, "AlreadySet");
		});
	});

	// ─── Full Arbitration Dispute Flow ────────────────────────────────────────
	// End-to-end integration test for the commit-reveal voting cycle.
	// Three jurors register, warp past the 7-day lock, commit hidden vote hashes,
	// advance to reveal phase, reveal, wait out the reveal deadline, then finalize.
	// After the appeal window the ruling is pushed to TrustLedger.executeRuling().
	// Also covers majority/minority classification, reward claiming, and the
	// fallback-to-50 ruling when no juror reveals.

	describe("Full Arbitration Dispute Flow (commit → reveal → finalize → execute)", function () {
		let jurors: Signer[];

		beforeEach(async function () {
			// Register 3 jurors (signers 3-5) and warp past the lock period
			const allSigners = await ethers.getSigners();
			jurors = allSigners.slice(3, 6);
			for (const j of jurors) {
				await jurorRegistry.connect(j).register({ value: ethers.parseEther("0.1") });
			}
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);
		});

		it("should run full dispute flow: commit → reveal → finalize → executeRuling", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			// ── Commit phase ──────────────────────────────────────────────────
			const votes = [70, 80, 75]; // all close → all majority (median = 75)
			const salts = ["salt0", "salt1", "salt2"];
			for (let i = 0; i < jurors.length; i++) {
				const j = jurors[i];
				const addr = await j.getAddress();
				const commitment = makeCommitment(disputeId, addr, votes[i], salts[i]);
				await arbitration.connect(j).commitVote(disputeId, commitment);
			}

			// Advance to reveal phase (min jurors met)
			await arbitration.advanceToReveal(disputeId);

			// ── Reveal phase ──────────────────────────────────────────────────
			for (let i = 0; i < jurors.length; i++) {
				await arbitration
					.connect(jurors[i])
					.revealVote(disputeId, votes[i], ethers.encodeBytes32String(salts[i]));
			}

			// Warp past reveal deadline
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			// ── Finalize ──────────────────────────────────────────────────────
			await expect(arbitration.finalizeDispute(disputeId))
				.to.emit(arbitration, "DisputeFinalized")
				.withArgs(disputeId, 75n); // median of [70, 75, 80]

			const finalized = await arbitration.getDispute(disputeId);
			expect(finalized.finalized).to.equal(true);
			expect(finalized.ruling).to.equal(75n);

			// Warp past appeal window
			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(finalized.phaseDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);

			// ── Execute ruling ─────────────────────────────────────────────────
			const freelancerAddr = await freelancer.getAddress();
			const clientAddr = await client.getAddress();
			const freelancerBefore = await ethers.provider.getBalance(freelancerAddr);
			const clientBefore = await ethers.provider.getBalance(clientAddr);

			await arbitration.executeRuling(disputeId);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.RESOLVED);

			// Verify funds distributed (freelancer should get more than 0 at 75%)
			expect(await ethers.provider.getBalance(freelancerAddr)).to.be.gt(freelancerBefore);
			expect(await ethers.provider.getBalance(clientAddr)).to.be.gt(clientBefore);
		});

		it("should correctly identify majority jurors after finalization", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			const votes = [50, 50, 99]; // jurors[0] and [1] in majority (median=50), jurors[2] is minority
			const salts = ["a", "b", "c"];
			for (let i = 0; i < jurors.length; i++) {
				const addr = await jurors[i].getAddress();
				const commitment = makeCommitment(disputeId, addr, votes[i], salts[i]);
				await arbitration.connect(jurors[i]).commitVote(disputeId, commitment);
			}
			await arbitration.advanceToReveal(disputeId);
			for (let i = 0; i < jurors.length; i++) {
				await arbitration
					.connect(jurors[i])
					.revealVote(disputeId, votes[i], ethers.encodeBytes32String(salts[i]));
			}
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);
			await arbitration.finalizeDispute(disputeId);

			expect(await arbitration.isMajority(disputeId, await jurors[0].getAddress())).to.equal(
				true,
			);
			expect(await arbitration.isMajority(disputeId, await jurors[1].getAddress())).to.equal(
				true,
			);
			expect(await arbitration.isMajority(disputeId, await jurors[2].getAddress())).to.equal(
				false,
			);
		});

		it("should allow majority jurors to claim reward after appeal window", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			const votes = [60, 60, 60];
			const salts = ["x", "y", "z"];
			for (let i = 0; i < jurors.length; i++) {
				const addr = await jurors[i].getAddress();
				await arbitration
					.connect(jurors[i])
					.commitVote(disputeId, makeCommitment(disputeId, addr, votes[i], salts[i]));
			}
			await arbitration.advanceToReveal(disputeId);
			for (let i = 0; i < jurors.length; i++) {
				await arbitration
					.connect(jurors[i])
					.revealVote(disputeId, votes[i], ethers.encodeBytes32String(salts[i]));
			}
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);
			await arbitration.finalizeDispute(disputeId);

			const d2 = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d2.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			// All 3 jurors are majority - each gets feePool/3
			const before = await ethers.provider.getBalance(await jurors[0].getAddress());
			const tx = await arbitration.connect(jurors[0]).claimReward(disputeId);
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("transaction not mined");
			const gas = receipt.gasUsed * receipt.gasPrice;
			const after = await ethers.provider.getBalance(await jurors[0].getAddress());
			expect(after + gas).to.be.gt(before);
		});

		it("should default ruling to 50 when no jurors reveal", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			// Commit but do NOT reveal
			for (let i = 0; i < jurors.length; i++) {
				const addr = await jurors[i].getAddress();
				await arbitration
					.connect(jurors[i])
					.commitVote(disputeId, makeCommitment(disputeId, addr, 80, `s${String(i)}`));
			}
			await arbitration.advanceToReveal(disputeId);

			// Warp past reveal deadline without revealing
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			await expect(arbitration.finalizeDispute(disputeId))
				.to.emit(arbitration, "DisputeFinalized")
				.withArgs(disputeId, 50n);
		});
	});

	// ─── Appeal Flow ──────────────────────────────────────────────────────────
	// Tests appeal() preconditions (bond size, window timing, party-only access,
	// double-appeal guard), the bond return/forfeiture logic inside _resolveAppeal(),
	// the doubled juror panel on the appeal dispute, and the exclusion of original
	// jurors from voting in the appeal.  Six jurors are registered: the first three
	// serve as original jurors and the last three as fresh appeal jurors.

	describe("Appeal Flow", function () {
		// Runs a full commit→reveal→finalize cycle for the given dispute using the
		// contract's pre-selected juror panel (from getJurors), all voting the same value.
		async function runDisputeToFinalized(disputeId: bigint, vote: number): Promise<bigint> {
			const allSigners = await ethers.getSigners();
			const addrToSigner = new Map(
				await Promise.all(allSigners.map(async (s) => [await s.getAddress(), s] as const)),
			);
			const selectedAddrs = await arbitration.getJurors(disputeId);
			const salts: string[] = [];
			for (let i = 0; i < selectedAddrs.length; i++) salts.push(`salt${String(i)}`);
			for (let i = 0; i < selectedAddrs.length; i++) {
				const signer = addrToSigner.get(selectedAddrs[i]);
				if (signer === undefined)
					throw new Error(`No signer for pre-selected juror ${selectedAddrs[i]}`);
				await arbitration
					.connect(signer)
					.commitVote(
						disputeId,
						makeCommitment(disputeId, selectedAddrs[i], vote, salts[i]),
					);
			}
			await arbitration.advanceToReveal(disputeId);
			for (let i = 0; i < selectedAddrs.length; i++) {
				const signer = addrToSigner.get(selectedAddrs[i]);
				if (signer === undefined)
					throw new Error(`No signer for pre-selected juror ${selectedAddrs[i]}`);
				await arbitration
					.connect(signer)
					.revealVote(disputeId, vote, ethers.encodeBytes32String(salts[i]));
			}
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);
			await arbitration.finalizeDispute(disputeId);
			const df = await arbitration.getDispute(disputeId);
			return df.ruling;
		}

		beforeEach(async function () {
			// Register 8 jurors: openDispute() auto-selects 5 (BASE_MAX_JURORS), leaving
			// 3 fresh ones eligible for the appeal (original jurors are excluded).
			const allSigners = await ethers.getSigners();
			const jurors = allSigners.slice(3, 11);
			for (const j of jurors) {
				await jurorRegistry.connect(j).register({ value: ethers.parseEther("0.1") });
			}
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);
		});

		it("should accept appeal with correct bond and open appeal dispute", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 30);
			const d = await arbitration.getDispute(disputeId);

			// Bond = feePool × 1.5
			const bond = (d.feePool * 15000n) / 10000n;
			await expect(arbitration.connect(client).appeal(disputeId, { value: bond }))
				.to.emit(arbitration, "Appealed")
				.withArgs(disputeId, await client.getAddress(), bond)
				.and.to.emit(arbitration, "AppealDisputeOpened");

			const updated = await arbitration.getDispute(disputeId);
			expect(updated.appealed).to.equal(true);
			expect(updated.appealer).to.equal(await client.getAddress());
		});

		it("should revert appeal with insufficient bond", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 30);

			await expect(
				arbitration.connect(client).appeal(disputeId, { value: 1n }),
			).to.be.revertedWithCustomError(arbitration, "InsufficientAppealBond");
		});

		it("should revert appeal after window has elapsed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 30);
			const d = await arbitration.getDispute(disputeId);

			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			const bond = (d.feePool * 15000n) / 10000n;
			await expect(
				arbitration.connect(client).appeal(disputeId, { value: bond }),
			).to.be.revertedWithCustomError(arbitration, "AppealWindowElapsed");
		});

		it("should revert appeal from non-party", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 30);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;

			await expect(
				arbitration.connect(stranger).appeal(disputeId, { value: bond }),
			).to.be.revertedWithCustomError(arbitration, "NotParty");
		});

		it("should revert double appeal", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 30);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;

			await arbitration.connect(client).appeal(disputeId, { value: bond });
			await expect(
				arbitration.connect(freelancer).appeal(disputeId, { value: bond }),
			).to.be.revertedWithCustomError(arbitration, "AlreadyAppealed");
		});

		it("should return bond to appealer when appeal changes ruling", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			// Original ruling = 30 (freelancer loses most funds)
			await runDisputeToFinalized(disputeId, 30);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;

			const clientAddr = await client.getAddress();
			await arbitration.connect(client).appeal(disputeId, { value: bond });

			// Appeal ruling = 90 (changed from 30) → bond returned to client
			const appealDisputeId = 1n;
			const clientBalBefore = await ethers.provider.getBalance(clientAddr);
			await runDisputeToFinalized(appealDisputeId, 90);

			// After _resolveAppeal executes, client bond is returned and TrustLedger is resolved
			const clientBalAfter = await ethers.provider.getBalance(clientAddr);
			expect(clientBalAfter).to.be.gt(clientBalBefore);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.RESOLVED);
		});

		it("should forfeit bond when appeal does not change ruling", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			// Original ruling = 50
			await runDisputeToFinalized(disputeId, 50);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;

			await arbitration.connect(client).appeal(disputeId, { value: bond });

			// Appeal gives same ruling = 50 → bond forfeited (stays in feePool)
			const appealDisputeId = 1n;
			await runDisputeToFinalized(appealDisputeId, 50);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(STATUS.RESOLVED); // ruling executed even when bond forfeited
		});

		it("should double maxJurors in appeal dispute", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 50);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;
			await arbitration.connect(client).appeal(disputeId, { value: bond });

			const appealDispute = await arbitration.getDispute(1n);
			expect(appealDispute.maxJurors).to.equal(d.maxJurors * 2n);
		});

		it("should block original jurors from voting in appeal", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(disputeId, 50);

			// Read an original juror's address and find its signer
			const originalPanel = await arbitration.getJurors(disputeId);
			const allSigners = await ethers.getSigners();
			const addrToSigner = new Map(
				await Promise.all(allSigners.map(async (s) => [await s.getAddress(), s] as const)),
			);
			const originalJurorSigner = addrToSigner.get(originalPanel[0]);
			if (originalJurorSigner === undefined) throw new Error("No signer for original juror");

			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;
			await arbitration.connect(client).appeal(disputeId, { value: bond });

			// Original juror tries to commit to the appeal dispute → ExcludedJuror
			const appealDisputeId = 1n;
			const commitment = ethers.keccak256(ethers.toUtf8Bytes("test"));
			await expect(
				arbitration.connect(originalJurorSigner).commitVote(appealDisputeId, commitment),
			).to.be.revertedWithCustomError(arbitration, "ExcludedJuror");
		});
	});

	// ─── ReputationRegistry ───────────────────────────────────────────────────
	// Deploys ReputationRegistry and wires it into TrustLedger via
	// initReputationRegistry().  Tests bidirectional ratings (client rates
	// freelancer, freelancer rates client), accumulation across contracts,
	// score range enforcement, the double-rating guard, timing restrictions
	// (must be APPROVED or RESOLVED), the silent no-op when no registry is wired,
	// and direct rate() protection (only TrustLedger may call it).

	describe("ReputationRegistry", function () {
		let repRegistry: ReputationRegistry;

		beforeEach(async function () {
			const RepFactory = await ethers.getContractFactory("ReputationRegistry", client);
			repRegistry = (await RepFactory.deploy(
				await trustLedger.getAddress(),
			)) as unknown as ReputationRegistry;
			await repRegistry.waitForDeployment();

			await trustLedger
				.connect(client)
				.initReputationRegistry(await repRegistry.getAddress());
		});

		it("should start with zero ratings", async function () {
			const [num, den] = await repRegistry.averageRating(await freelancer.getAddress());
			expect(num).to.equal(0n);
			expect(den).to.equal(0n);
		});

		it("should allow client to rate freelancer after approval", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id);

			await expect(trustLedger.connect(client).submitRating(id, 90))
				.to.emit(trustLedger, "RatingSubmitted")
				.withArgs(id, await client.getAddress(), 90);

			const [num, den] = await repRegistry.averageRating(await freelancer.getAddress());
			expect(num).to.equal(90n);
			expect(den).to.equal(1n);
		});

		it("should allow freelancer to rate client after approval", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id);

			await expect(trustLedger.connect(freelancer).submitRating(id, 75))
				.to.emit(trustLedger, "RatingSubmitted")
				.withArgs(id, await freelancer.getAddress(), 75);

			const [num, den] = await repRegistry.averageRating(await client.getAddress());
			expect(num).to.equal(75n);
			expect(den).to.equal(1n);
		});

		it("should accumulate multiple ratings correctly", async function () {
			const id1 = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id1);
			await trustLedger.connect(client).submitRating(id1, 80);

			const id2 = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id2);
			await trustLedger.connect(client).submitRating(id2, 60);

			const [num, den] = await repRegistry.averageRating(await freelancer.getAddress());
			expect(num).to.equal(140n); // 80 + 60
			expect(den).to.equal(2n);
		});

		it("should revert submitRating with score = 0", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id);
			await expect(
				trustLedger.connect(client).submitRating(id, 0),
			).to.be.revertedWithCustomError(trustLedger, "RatingOutOfRange");
		});

		it("should revert submitRating with score > 100", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id);
			await expect(
				trustLedger.connect(client).submitRating(id, 101),
			).to.be.revertedWithCustomError(trustLedger, "RatingOutOfRange");
		});

		it("should revert double rating from same party", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id);
			await trustLedger.connect(client).submitRating(id, 80);
			await expect(
				trustLedger.connect(client).submitRating(id, 70),
			).to.be.revertedWithCustomError(trustLedger, "RatingAlreadySubmitted");
		});

		it("should revert submitRating from stranger", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).approveWork(id);
			await expect(
				trustLedger.connect(stranger).submitRating(id, 80),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert submitRating before contract is finished", async function () {
			const id = await createAcceptAndSubmit();
			// Still in SUBMITTED status
			await expect(
				trustLedger.connect(client).submitRating(id, 80),
			).to.be.revertedWithCustomError(trustLedger, "ContractNotFinished");
		});

		it("should allow rating after RESOLVED status", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);

			const arbSigner = await impersonate(await arbitration.getAddress());
			await trustLedger.connect(arbSigner).executeRuling(id, 50n);

			await expect(trustLedger.connect(client).submitRating(id, 50)).to.emit(
				trustLedger,
				"RatingSubmitted",
			);
		});

		it("should no-op submitRating when registry not set", async function () {
			const arb2Addr = ethers.getCreateAddress({
				from: await client.getAddress(),
				nonce: (await ethers.provider.getTransactionCount(await client.getAddress())) + 2,
			});
			const JRF = await ethers.getContractFactory("JurorRegistry", client);
			await JRF.deploy(arb2Addr);
			const TLF = await ethers.getContractFactory("TrustLedger", client);
			const tl2 = (await TLF.deploy(arb2Addr)) as unknown as TrustLedger;

			const tx2 = await tl2
				.connect(freelancer)
				.proposeContract(
					await client.getAddress(),
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					ethers.ZeroAddress,
					AMOUNT,
				);
			const receipt2 = await tx2.wait();
			const ev = receipt2?.logs
				.map((log) => {
					try {
						return tl2.interface.parseLog(log);
					} catch {
						return null;
					}
				})
				.find((e) => e?.name === "ContractProposed");
			const id = ev?.args[0] as bigint;

			await tl2.connect(client).acceptContract(id, { value: AMOUNT });
			await tl2.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");
			await tl2.connect(client).approveWork(id);

			await expect(tl2.connect(client).submitRating(id, 80)).to.not.be.reverted;
		});

		it("should revert rate() when called directly (not from TrustLedger)", async function () {
			await expect(
				repRegistry.connect(stranger).rate(await freelancer.getAddress(), 80),
			).to.be.revertedWithCustomError(repRegistry, "OnlyTrustLedger");
		});

		it("should revert rate() with invalid score", async function () {
			// Call via impersonation of TrustLedger
			const tlSigner = await impersonate(await trustLedger.getAddress());
			await expect(
				repRegistry.connect(tlSigner).rate(await freelancer.getAddress(), 0),
			).to.be.revertedWithCustomError(repRegistry, "InvalidScore");
			await expect(
				repRegistry.connect(tlSigner).rate(await freelancer.getAddress(), 101),
			).to.be.revertedWithCustomError(repRegistry, "InvalidScore");
		});
	});

	// ─── Input Validation ─────────────────────────────────────────────────────

	describe("Input Validation", function () {
		// Thin wrapper so each case only needs to override the relevant parameter.
		async function createWith(overrides: {
			hash?: string;
			uri?: string;
			arbFeeBps?: number;
			holdBackBps?: number;
			warranty?: bigint;
			amount?: bigint;
		}) {
			const o = {
				hash: CONTRACT_HASH,
				uri: "ipfs://test",
				arbFeeBps: ARB_FEE_BPS,
				holdBackBps: 0,
				warranty: 0n,
				amount: AMOUNT,
				...overrides,
			};
			return await trustLedger
				.connect(freelancer)
				.proposeContract(
					await client.getAddress(),
					o.hash,
					o.uri,
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					o.arbFeeBps,
					o.holdBackBps,
					o.warranty,
					ethers.ZeroAddress,
					o.amount,
				);
		}

		it("should revert createContract with zero contractHash", async function () {
			await expect(createWith({ hash: ethers.ZeroHash })).to.be.revertedWithCustomError(
				trustLedger,
				"ContractHashRequired",
			);
		});

		it("should revert createContract with empty contractURI", async function () {
			await expect(createWith({ uri: "" })).to.be.revertedWithCustomError(
				trustLedger,
				"ContractURIRequired",
			);
		});

		it("should revert createContract with zero arbitrationFeeBps", async function () {
			await expect(createWith({ arbFeeBps: 0 })).to.be.revertedWithCustomError(
				trustLedger,
				"InvalidArbitrationFee",
			);
		});

		it("should revert createContract with arbitrationFeeBps > 5000", async function () {
			await expect(createWith({ arbFeeBps: 5001 })).to.be.revertedWithCustomError(
				trustLedger,
				"InvalidArbitrationFee",
			);
		});

		it("should revert createContract with holdBackBps below minimum (300)", async function () {
			await expect(
				createWith({ holdBackBps: 300, warranty: 7n * 24n * 3600n }),
			).to.be.revertedWithCustomError(trustLedger, "InvalidHoldBack");
		});

		it("should revert createContract with holdBackBps above maximum (1600)", async function () {
			await expect(
				createWith({ holdBackBps: 1600, warranty: 7n * 24n * 3600n }),
			).to.be.revertedWithCustomError(trustLedger, "InvalidHoldBack");
		});

		it("should revert createContract with holdBack set but warrantyPeriod = 0", async function () {
			await expect(
				createWith({ holdBackBps: 1000, warranty: 0n }),
			).to.be.revertedWithCustomError(trustLedger, "InvalidWarrantyPeriod");
		});

		it("should revert createContract with warrantyPeriod set but holdBack = 0", async function () {
			await expect(
				createWith({ holdBackBps: 0, warranty: 7n * 24n * 3600n }),
			).to.be.revertedWithCustomError(trustLedger, "InvalidWarrantyPeriod");
		});

		it("should revert proposeContract with zero amount", async function () {
			await expect(createWith({ amount: 0n })).to.be.revertedWithCustomError(
				trustLedger,
				"ProposalAmountZero",
			);
		});

		it("should revert submitProofOfWork with zero powHash", async function () {
			const id = await createAndAccept();
			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, ethers.ZeroHash, "ipfs://"),
			).to.be.revertedWithCustomError(trustLedger, "EmptyHash");
		});

		it("should revert submitProofOfWork with empty powURI", async function () {
			const id = await createAndAccept();
			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, ""),
			).to.be.revertedWithCustomError(trustLedger, "EmptyURI");
		});

		it("should revert initPriceFeed with zero address", async function () {
			await expect(
				trustLedger.connect(client).initPriceFeed(ethers.ZeroAddress),
			).to.be.revertedWithCustomError(trustLedger, "ZeroAddress");
		});

		it("should revert initReputationRegistry with zero address", async function () {
			await expect(
				trustLedger.connect(client).initReputationRegistry(ethers.ZeroAddress),
			).to.be.revertedWithCustomError(trustLedger, "ZeroAddress");
		});
	});

	// ─── State Guards ─────────────────────────────────────────────────────────

	describe("State Guards", function () {
		it("should revert rejectContract when caller is not client", async function () {
			const id = await createContract();
			await expect(
				trustLedger.connect(stranger).rejectContract(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert rejectContract when status is not PENDING", async function () {
			const id = await createAndAccept(); // ACTIVE
			await expect(
				trustLedger.connect(client).rejectContract(id),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert cancelProposal when caller is not freelancer", async function () {
			const id = await createContract();
			await expect(
				trustLedger.connect(stranger).cancelProposal(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert cancelProposal when status is not PENDING", async function () {
			const id = await createAndAccept(); // ACTIVE
			await expect(
				trustLedger.connect(freelancer).cancelProposal(id),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert submitProofOfWork when caller is not freelancer", async function () {
			const id = await createAndAccept();
			await expect(
				trustLedger.connect(stranger).submitProofOfWork(id, POW_HASH, "ipfs://"),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert submitProofOfWork when status is not ACTIVE", async function () {
			const id = await createContract(); // PENDING
			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://"),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should start the project deadline only once the client accepts", async function () {
			const id = await createContract();
			// While PENDING, projectDeadline holds the relative buffered duration, not a timestamp.
			const proposed = await trustLedger.getContract(id);
			const expectedDuration = (ESTIMATED_DURATION * BUFFER_FACTOR) / 1000n;
			expect(proposed.projectDeadline).to.equal(expectedDuration);

			await trustLedger.connect(client).acceptContract(id, { value: AMOUNT });
			const accepted = await trustLedger.getContract(id);
			// After acceptance it becomes an absolute, future timestamp.
			const nowTs = BigInt((await ethers.provider.getBlock("latest"))?.timestamp ?? 0);
			expect(accepted.projectDeadline).to.be.gt(nowTs);
		});

		it("should revert disputeWork when caller is not client", async function () {
			const id = await createAcceptAndSubmit();
			await expect(
				trustLedger.connect(stranger).disputeWork(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert disputeWork when status is not SUBMITTED", async function () {
			const id = await createAndAccept(); // ACTIVE
			await expect(trustLedger.connect(client).disputeWork(id)).to.be.revertedWithCustomError(
				trustLedger,
				"InvalidStatus",
			);
		});

		it("should revert disputeWork for ETH escrow when msg.value is non-zero", async function () {
			const id = await createAcceptAndSubmit();
			await expect(
				trustLedger.connect(client).disputeWork(id, { value: ethers.parseEther("0.01") }),
			).to.be.revertedWithCustomError(trustLedger, "InvalidTokenParams");
		});

		it("should revert disputeWork after acceptance window has elapsed", async function () {
			const id = await createAcceptAndSubmit();
			const c = await trustLedger.getContract(id);
			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(c.acceptanceDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);
			await expect(trustLedger.connect(client).disputeWork(id)).to.be.revertedWithCustomError(
				trustLedger,
				"WindowElapsed",
			);
		});

		it("should revert claimAfterAcceptanceWindow when caller is not freelancer", async function () {
			const id = await createAcceptAndSubmit();
			const c = await trustLedger.getContract(id);
			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(c.acceptanceDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);
			await expect(
				trustLedger.connect(stranger).claimAfterAcceptanceWindow(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert claimWarrantyFunds when caller is not freelancer", async function () {
			const id = await createAcceptAndSubmit({
				holdBackBps: 1000,
				warrantyPeriod: 7n * 24n * 3600n,
			});
			await trustLedger.connect(client).approveWork(id);
			const c = await trustLedger.getContract(id);
			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(c.warrantyDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);
			await expect(
				trustLedger.connect(stranger).claimWarrantyFunds(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert claimWarrantyFunds when holdBackAmount is zero (no holdBack set)", async function () {
			const id = await createAcceptAndSubmit(); // holdBackBps = 0
			await trustLedger.connect(client).approveWork(id);
			await expect(
				trustLedger.connect(freelancer).claimWarrantyFunds(id),
			).to.be.revertedWithCustomError(trustLedger, "InvalidHoldBack");
		});

		it("should revert claimAfterDeadlineMiss when caller is not client", async function () {
			const id = await createAndAccept();
			const c = await trustLedger.getContract(id);
			await ethers.provider.send("evm_setNextBlockTimestamp", [
				Number(c.projectDeadline) + 1,
			]);
			await ethers.provider.send("evm_mine", []);
			await expect(
				trustLedger.connect(stranger).claimAfterDeadlineMiss(id),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert claimAfterDeadlineMiss when status is not ACTIVE", async function () {
			const id = await createContract(); // PENDING
			await expect(
				trustLedger.connect(client).claimAfterDeadlineMiss(id),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert executeRuling when status is not DISPUTED", async function () {
			const id = await createAcceptAndSubmit(); // SUBMITTED
			const arbSigner = await impersonate(await arbitration.getAddress());
			await expect(
				trustLedger.connect(arbSigner).executeRuling(id, 50n),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});
	});

	// ─── JurorRegistry ────────────────────────────────────────────────────────

	describe("JurorRegistry", function () {
		it("should revert register when already registered", async function () {
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await expect(
				jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") }),
			).to.be.revertedWithCustomError(jurorRegistry, "AlreadyRegistered");
		});

		it("should revert register when stake is below minimum", async function () {
			await expect(
				jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.001") }),
			).to.be.revertedWithCustomError(jurorRegistry, "StakeBelowMinimum");
		});

		it("should revert addStake when not registered", async function () {
			await expect(
				jurorRegistry.connect(stranger).addStake({ value: ethers.parseEther("0.1") }),
			).to.be.revertedWithCustomError(jurorRegistry, "NotRegistered");
		});

		it("should revert addStake with zero value", async function () {
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await expect(
				jurorRegistry.connect(stranger).addStake({ value: 0n }),
			).to.be.revertedWithCustomError(jurorRegistry, "StakeBelowMinimum");
		});

		it("should accumulate stake via addStake and reset lock period", async function () {
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await jurorRegistry.connect(stranger).addStake({ value: ethers.parseEther("0.05") });
			const info = await jurorRegistry.getJuror(await stranger.getAddress());
			expect(info.stake).to.equal(ethers.parseEther("0.15"));
		});

		it("should revert unstake when not registered", async function () {
			await expect(
				jurorRegistry.connect(stranger).unstake(ethers.parseEther("0.01")),
			).to.be.revertedWithCustomError(jurorRegistry, "NotRegistered");
		});

		it("should revert unstake when stake is still locked", async function () {
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await expect(
				jurorRegistry.connect(stranger).unstake(ethers.parseEther("0.01")),
			).to.be.revertedWithCustomError(jurorRegistry, "StakeLocked");
		});

		it("should revert unstake when amount exceeds balance", async function () {
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);
			await expect(
				jurorRegistry.connect(stranger).unstake(ethers.parseEther("1")),
			).to.be.revertedWithCustomError(jurorRegistry, "InsufficientStake");
		});

		it("should allow unstake and deactivate juror when stake falls below minimum", async function () {
			const strangerAddr = await stranger.getAddress();
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);

			const balBefore = await ethers.provider.getBalance(strangerAddr);
			const tx = await jurorRegistry.connect(stranger).unstake(ethers.parseEther("0.1"));
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("not mined");
			const gas = receipt.gasUsed * receipt.gasPrice;
			const balAfter = await ethers.provider.getBalance(strangerAddr);

			expect(balAfter + gas - balBefore).to.equal(ethers.parseEther("0.1"));
			expect((await jurorRegistry.getJuror(strangerAddr)).active).to.equal(false);
		});

		it("should revert unstake when juror has active disputes", async function () {
			const strangerAddr = await stranger.getAddress();
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);

			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;
			const commitment = makeCommitment(disputeId, strangerAddr, 50, "salt");
			await arbitration.connect(stranger).commitVote(disputeId, commitment);

			await expect(
				jurorRegistry.connect(stranger).unstake(ethers.parseEther("0.01")),
			).to.be.revertedWithCustomError(jurorRegistry, "HasActiveDisputes");
		});

		it("should revert lockForDispute when not arbitration", async function () {
			await expect(
				jurorRegistry.connect(stranger).lockForDispute(await stranger.getAddress()),
			).to.be.revertedWithCustomError(jurorRegistry, "OnlyArbitration");
		});

		it("should revert unlockFromDispute when not arbitration", async function () {
			await expect(
				jurorRegistry.connect(stranger).unlockFromDispute(await stranger.getAddress()),
			).to.be.revertedWithCustomError(jurorRegistry, "OnlyArbitration");
		});

		it("should revert slash when not arbitration", async function () {
			await expect(
				jurorRegistry.connect(stranger).slash(await stranger.getAddress(), 100n),
			).to.be.revertedWithCustomError(jurorRegistry, "OnlyArbitration");
		});

		it("should increment eligibleJurorCount after lock period elapses", async function () {
			const countBefore = await jurorRegistry.eligibleJurorCount();
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			expect(await jurorRegistry.eligibleJurorCount()).to.equal(countBefore); // locked
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);
			expect(await jurorRegistry.eligibleJurorCount()).to.equal(countBefore + 1n);
		});

		it("should return getCooldownUntil = 0 for fresh juror", async function () {
			await jurorRegistry.connect(stranger).register({ value: ethers.parseEther("0.1") });
			expect(await jurorRegistry.getCooldownUntil(await stranger.getAddress())).to.equal(0n);
		});
	});

	// ─── Amendment Flow ───────────────────────────────────────────────────────

	describe("Amendment Flow", function () {
		it("should link amendment and emit ContractAmended", async function () {
			const oldId = await createContract();
			await trustLedger.connect(freelancer).cancelProposal(oldId);
			const newId = await createContract();

			await expect(trustLedger.connect(freelancer).linkAmendment(newId, oldId))
				.to.emit(trustLedger, "ContractAmended")
				.withArgs(newId, oldId);

			const c = await trustLedger.getContract(newId);
			expect(c.previousContractId).to.equal(oldId);
		});

		it("should revert linkAmendment when caller is not freelancer of old contract", async function () {
			const oldId = await createContract();
			await trustLedger.connect(freelancer).cancelProposal(oldId);
			const newId = await createContract();
			await expect(
				trustLedger.connect(stranger).linkAmendment(newId, oldId),
			).to.be.revertedWithCustomError(trustLedger, "InvalidPreviousContract");
		});

		it("should revert linkAmendment when old contract is not CANCELLED", async function () {
			const oldId = await createContract(); // still PENDING
			const newId = await createContract();
			await expect(
				trustLedger.connect(freelancer).linkAmendment(newId, oldId),
			).to.be.revertedWithCustomError(trustLedger, "InvalidPreviousContract");
		});

		it("should revert linkAmendment when new contract is not PENDING", async function () {
			const oldId = await createContract();
			await trustLedger.connect(freelancer).cancelProposal(oldId);
			const newId = await createAndAccept(); // ACTIVE
			await expect(
				trustLedger.connect(freelancer).linkAmendment(newId, oldId),
			).to.be.revertedWithCustomError(trustLedger, "InvalidStatus");
		});

		it("should revert linkAmendment when already linked", async function () {
			const oldId = await createContract();
			await trustLedger.connect(freelancer).cancelProposal(oldId);
			const newId = await createContract();
			await trustLedger.connect(freelancer).linkAmendment(newId, oldId);

			const anotherId = await createContract();
			await trustLedger.connect(freelancer).cancelProposal(anotherId);
			await expect(
				trustLedger.connect(freelancer).linkAmendment(newId, anotherId),
			).to.be.revertedWithCustomError(trustLedger, "AlreadySet");
		});
	});

	// ─── Pauser ───────────────────────────────────────────────────────────────

	describe("Pauser", function () {
		it("should revert initPauser with zero address", async function () {
			await expect(
				trustLedger.connect(client).initPauser(ethers.ZeroAddress),
			).to.be.revertedWithCustomError(trustLedger, "ZeroAddress");
		});

		it("should revert initPauser when already set", async function () {
			await trustLedger.connect(client).initPauser(await client.getAddress());
			await expect(
				trustLedger.connect(client).initPauser(await client.getAddress()),
			).to.be.revertedWithCustomError(trustLedger, "AlreadySet");
		});

		it("should revert pause when caller is not pauser", async function () {
			await trustLedger.connect(client).initPauser(await client.getAddress());
			await expect(trustLedger.connect(stranger).pause()).to.be.revertedWithCustomError(
				trustLedger,
				"NotPauser",
			);
		});

		it("should block createContract when paused and re-enable after unpause", async function () {
			await trustLedger.connect(client).initPauser(await client.getAddress());
			await trustLedger.connect(client).pause();

			await expect(createContract()).to.be.reverted;

			await trustLedger.connect(client).unpause();
			await expect(createContract()).to.not.be.reverted;
		});
	});

	// ─── Automatic Reputation Penalties ───────────────────────────────────────

	describe("Automatic Reputation Penalties", function () {
		let penaltyRegistry: ReputationRegistry;

		beforeEach(async function () {
			const RepFactory = await ethers.getContractFactory("ReputationRegistry", client);
			penaltyRegistry = (await RepFactory.deploy(
				await trustLedger.getAddress(),
			)) as unknown as ReputationRegistry;
			await penaltyRegistry.waitForDeployment();
			await trustLedger
				.connect(client)
				.initReputationRegistry(await penaltyRegistry.getAddress());
		});

		it("should auto-penalize client (score=1) when completionPct >= 80", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const arbSigner = await impersonate(await arbitration.getAddress());
			await trustLedger.connect(arbSigner).executeRuling(id, 80n);

			const [num, den] = await penaltyRegistry.averageRating(await client.getAddress());
			expect(num).to.equal(1n);
			expect(den).to.equal(1n);
		});

		it("should block client submitRating after auto-penalty sets their rated flag", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const arbSigner = await impersonate(await arbitration.getAddress());
			await trustLedger.connect(arbSigner).executeRuling(id, 80n);

			await expect(
				trustLedger.connect(client).submitRating(id, 90),
			).to.be.revertedWithCustomError(trustLedger, "RatingAlreadySubmitted");
		});

		it("should auto-penalize freelancer (score=1) when completionPct <= 20", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const arbSigner = await impersonate(await arbitration.getAddress());
			await trustLedger.connect(arbSigner).executeRuling(id, 20n);

			const [num, den] = await penaltyRegistry.averageRating(await freelancer.getAddress());
			expect(num).to.equal(1n);
			expect(den).to.equal(1n);
		});

		it("should not auto-penalize either party at completionPct = 50", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const arbSigner = await impersonate(await arbitration.getAddress());
			await trustLedger.connect(arbSigner).executeRuling(id, 50n);

			const [, clientDen] = await penaltyRegistry.averageRating(await client.getAddress());
			const [, freelancerDen] = await penaltyRegistry.averageRating(
				await freelancer.getAddress(),
			);
			expect(clientDen).to.equal(0n);
			expect(freelancerDen).to.equal(0n);
		});
	});

	// ─── Arbitration Phase Guards ─────────────────────────────────────────────

	describe("Arbitration Phase Guards", function () {
		let phaseJurors: Signer[];

		beforeEach(async function () {
			const allSigners = await ethers.getSigners();
			phaseJurors = allSigners.slice(3, 8);
			for (const j of phaseJurors) {
				await jurorRegistry.connect(j).register({ value: ethers.parseEther("0.1") });
			}
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);
		});

		// Opens a dispute and has the first `n` phaseJurors commit with vote 50.
		async function commitN(disputeId: bigint, n: number) {
			for (let i = 0; i < n; i++) {
				const addr = await phaseJurors[i].getAddress();
				await arbitration
					.connect(phaseJurors[i])
					.commitVote(disputeId, makeCommitment(disputeId, addr, 50, `s${String(i)}`));
			}
		}

		it("should revert commitVote when not in commit phase", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await commitN(0n, 3);
			await arbitration.advanceToReveal(0n);

			const addr = await phaseJurors[3].getAddress();
			await expect(
				arbitration
					.connect(phaseJurors[3])
					.commitVote(0n, makeCommitment(0n, addr, 50, "s3")),
			).to.be.revertedWithCustomError(arbitration, "NotInCommitPhase");
		});

		it("should revert commitVote when commit phase deadline has elapsed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const d = await arbitration.getDispute(0n);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			const addr = await phaseJurors[0].getAddress();
			await expect(
				arbitration
					.connect(phaseJurors[0])
					.commitVote(0n, makeCommitment(0n, addr, 50, "s0")),
			).to.be.revertedWithCustomError(arbitration, "PhaseEnded");
		});

		it("should revert commitVote when juror already committed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const addr = await phaseJurors[0].getAddress();
			await arbitration
				.connect(phaseJurors[0])
				.commitVote(0n, makeCommitment(0n, addr, 50, "s0"));
			await expect(
				arbitration
					.connect(phaseJurors[0])
					.commitVote(0n, makeCommitment(0n, addr, 60, "s0")),
			).to.be.revertedWithCustomError(arbitration, "AlreadyCommitted");
		});

		it("should revert revealVote when still in commit phase", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const addr = await phaseJurors[0].getAddress();
			await arbitration
				.connect(phaseJurors[0])
				.commitVote(0n, makeCommitment(0n, addr, 50, "s0"));
			await expect(
				arbitration
					.connect(phaseJurors[0])
					.revealVote(0n, 50, ethers.encodeBytes32String("s0")),
			).to.be.revertedWithCustomError(arbitration, "NotInRevealPhase");
		});

		it("should revert revealVote when caller has not committed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await commitN(0n, 3);
			await arbitration.advanceToReveal(0n);
			// stranger is unregistered and was never pre-selected by RANDAO
			await expect(
				arbitration
					.connect(stranger)
					.revealVote(0n, 50, ethers.encodeBytes32String("salt")),
			).to.be.revertedWithCustomError(arbitration, "NotAJuror");
		});

		it("should revert revealVote with mismatched commitment values", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await commitN(0n, 3);
			await arbitration.advanceToReveal(0n);
			// Reveal with wrong pct → hash mismatch
			await expect(
				arbitration
					.connect(phaseJurors[0])
					.revealVote(0n, 99, ethers.encodeBytes32String("s0")),
			).to.be.revertedWithCustomError(arbitration, "InvalidCommitment");
		});

		it("should revert revealVote when already revealed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await commitN(0n, 3);
			await arbitration.advanceToReveal(0n);
			await arbitration
				.connect(phaseJurors[0])
				.revealVote(0n, 50, ethers.encodeBytes32String("s0"));
			await expect(
				arbitration
					.connect(phaseJurors[0])
					.revealVote(0n, 50, ethers.encodeBytes32String("s0")),
			).to.be.revertedWithCustomError(arbitration, "AlreadyRevealed");
		});

		it("should revert revealVote with completionPct > 100", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await commitN(0n, 3);
			await arbitration.advanceToReveal(0n);
			await expect(
				arbitration
					.connect(phaseJurors[0])
					.revealVote(0n, 101, ethers.encodeBytes32String("s0")),
			).to.be.revertedWithCustomError(arbitration, "CompletionPctOutOfRange");
		});

		it("should revert advanceToReveal when fewer than MIN_JURORS and deadline not elapsed", async function () {
			// Deploy fresh contracts with only 2 jurors so RANDAO selects jurorCount=2 < MIN_JURORS=3.
			const clientAddr = await client.getAddress();
			const nonce2 = await ethers.provider.getTransactionCount(clientAddr);
			const arb2Addr = ethers.getCreateAddress({ from: clientAddr, nonce: nonce2 + 2 });

			const jr2 = (await (
				await ethers.getContractFactory("JurorRegistry", client)
			).deploy(arb2Addr)) as unknown as JurorRegistry;
			const tl2 = (await (
				await ethers.getContractFactory("TrustLedger", client)
			).deploy(arb2Addr)) as unknown as TrustLedger;
			const arb2 = (await (
				await ethers.getContractFactory("Arbitration", client)
			).deploy(await tl2.getAddress(), await jr2.getAddress())) as unknown as Arbitration;

			const allSigners = await ethers.getSigners();
			for (const j of allSigners.slice(3, 5)) {
				await jr2.connect(j).register({ value: ethers.parseEther("0.1") });
			}
			await ethers.provider.send("evm_increaseTime", [7 * 24 * 3600 + 1]);
			await ethers.provider.send("evm_mine", []);

			const tx2 = await tl2
				.connect(freelancer)
				.proposeContract(
					await client.getAddress(),
					CONTRACT_HASH,
					"ipfs://QmC",
					ESTIMATED_DURATION,
					BUFFER_FACTOR,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					ethers.ZeroAddress,
					AMOUNT,
				);
			const rcpt2 = await tx2.wait();
			const cid = rcpt2?.logs
				.map((l) => {
					try {
						return tl2.interface.parseLog(l);
					} catch {
						return null;
					}
				})
				.find((e) => e?.name === "ContractProposed")?.args[0] as bigint;

			await tl2.connect(client).acceptContract(cid, { value: AMOUNT });
			await tl2.connect(freelancer).submitProofOfWork(cid, POW_HASH, "ipfs://QmP");
			await tl2.connect(client).disputeWork(cid);

			// RANDAO selected 2 jurors (< MIN_JURORS=3); commit deadline not yet elapsed
			await expect(arb2.advanceToReveal(0n)).to.be.revertedWithCustomError(
				arb2,
				"PhaseNotEnded",
			);
		});

		it("should revert finalizeDispute when not in reveal phase", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			// Still in COMMIT phase
			await expect(arbitration.finalizeDispute(0n)).to.be.revertedWithCustomError(
				arbitration,
				"NotInRevealPhase",
			);
		});

		it("should revert finalizeDispute before reveal deadline elapses", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await commitN(0n, 3);
			await arbitration.advanceToReveal(0n);
			// Reveal deadline not yet elapsed
			await expect(arbitration.finalizeDispute(0n)).to.be.revertedWithCustomError(
				arbitration,
				"PhaseNotEnded",
			);
		});

		it("should revert executeRuling when dispute is not finalized", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			await expect(arbitration.executeRuling(0n)).to.be.revertedWithCustomError(
				arbitration,
				"DisputeNotFinalized",
			);
		});

		it("should revert openDispute when caller is not TrustLedger", async function () {
			await expect(
				arbitration
					.connect(stranger)
					.openDispute(
						0n,
						await client.getAddress(),
						await freelancer.getAddress(),
						AMOUNT,
						100n,
						{ value: 100n },
					),
			).to.be.revertedWithCustomError(arbitration, "OnlyTrustLedger");
		});

		it("should revert claimReward for a minority juror", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			// votes: [50, 50, 99] → median = 50; jurors[2] is minority (|99-50|=49 > 20)
			const votes = [50, 50, 99];
			const salts = ["a", "b", "c"];
			for (let i = 0; i < 3; i++) {
				const addr = await phaseJurors[i].getAddress();
				await arbitration
					.connect(phaseJurors[i])
					.commitVote(disputeId, makeCommitment(disputeId, addr, votes[i], salts[i]));
			}
			await arbitration.advanceToReveal(disputeId);
			for (let i = 0; i < 3; i++) {
				await arbitration
					.connect(phaseJurors[i])
					.revealVote(disputeId, votes[i], ethers.encodeBytes32String(salts[i]));
			}
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);
			await arbitration.finalizeDispute(disputeId);
			const d2 = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d2.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			await expect(
				arbitration.connect(phaseJurors[2]).claimReward(disputeId),
			).to.be.revertedWithCustomError(arbitration, "NotMajority");
		});

		it("should revert claimReward when already claimed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			const votes = [60, 60, 60];
			const salts = ["x", "y", "z"];
			for (let i = 0; i < 3; i++) {
				const addr = await phaseJurors[i].getAddress();
				await arbitration
					.connect(phaseJurors[i])
					.commitVote(disputeId, makeCommitment(disputeId, addr, votes[i], salts[i]));
			}
			await arbitration.advanceToReveal(disputeId);
			for (let i = 0; i < 3; i++) {
				await arbitration
					.connect(phaseJurors[i])
					.revealVote(disputeId, votes[i], ethers.encodeBytes32String(salts[i]));
			}
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);
			await arbitration.finalizeDispute(disputeId);
			const d2 = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d2.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);

			await arbitration.connect(phaseJurors[0]).claimReward(disputeId);
			await expect(
				arbitration.connect(phaseJurors[0]).claimReward(disputeId),
			).to.be.revertedWithCustomError(arbitration, "RewardAlreadyClaimed");
		});
	});
});
