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
//   - acceptContract now requires an ECDSA signature from the freelancer wallet

import { expect } from "chai";
import { ethers } from "hardhat";
import type { Signer } from "ethers";

import type { TrustLedger, JurorRegistry, Arbitration } from "../artifacts/typechain-types";

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
		jurorRegistry = (await JurorRegistryFactory.deploy(arbitrationAddr)) as unknown as JurorRegistry;
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

	// Creates an escrow contract with optional overrides.
	// Passes address(0) and 0 for the new token/tokenAmount params (ETH escrow).
	async function createContract(opts?: {
		holdBackBps?: number;
		warrantyPeriod?: bigint;
		amount?: bigint;
	}) {
		const holdBack = opts?.holdBackBps ?? 0;
		const warranty = opts?.warrantyPeriod ?? 0n;
		const amount = opts?.amount ?? AMOUNT;

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
				ethers.ZeroAddress, // token = address(0) → ETH escrow
				0n, // tokenAmount = 0 for ETH escrows
				{ value: amount },
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
			.find((e) => e?.name === "ContractCreated");

		return event?.args[0] as bigint;
	}

	// Signs an EIP-191 acceptance message for the given contract ID.
	// Must match the on-chain ecrecover call in acceptContract().
	async function signAccept(id: bigint): Promise<{ v: number; r: string; s: string }> {
		const freelancerAddr = await freelancer.getAddress();

		// innerHash = keccak256(abi.encodePacked(id, freelancerAddress))
		const innerHash = ethers.solidityPackedKeccak256(["uint256", "address"], [id, freelancerAddr]);

		// eth_sign adds the EIP-191 prefix before signing.
		// ethers.Signer.signMessage applies "\x19Ethereum Signed Message:\n32" automatically.
		const sig = await freelancer.signMessage(ethers.getBytes(innerHash));
		const { v, r, s } = ethers.Signature.from(sig);
		return { v, r, s };
	}

	// Creates a contract AND has the freelancer sign and call acceptContract.
	async function createAndAccept(opts?: Parameters<typeof createContract>[0]) {
		const id = await createContract(opts);
		const { v, r, s } = await signAccept(id);
		await trustLedger.connect(freelancer).acceptContract(id, v, r, s);
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
			expect(c.status).to.equal(0); // PENDING
			expect(c.contractHash).to.equal(CONTRACT_HASH);
			expect(c.token).to.equal(ethers.ZeroAddress); // ETH escrow
		});

		it("should allow freelancer to accept with valid signature", async function () {
			const id = await createContract();
			const { v, r, s } = await signAccept(id);

			// `emit` checks that the transaction emitted ContractAccepted(id).
			await expect(trustLedger.connect(freelancer).acceptContract(id, v, r, s))
				.to.emit(trustLedger, "ContractAccepted")
				.withArgs(id);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(1); // ACTIVE
		});

		it("should allow freelancer to submit proof of work", async function () {
			const id = await createAndAccept();
			await expect(
				trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW"),
			)
				.to.emit(trustLedger, "ProofSubmitted")
				.withArgs(id, POW_HASH, "ipfs://QmPoW");

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(2); // SUBMITTED
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

	// ─── Cancel Pending ───────────────────────────────────────────────────────

	describe("Cancel Pending", function () {
		it("should refund client when they cancel a pending contract", async function () {
			const id = await createContract();
			const clientAddr = await client.getAddress();
			const balBefore = await ethers.provider.getBalance(clientAddr);

			const tx = await trustLedger.connect(client).cancelPending(id);
			const receipt = await tx.wait();
			if (receipt === null) throw new Error("transaction not mined");
			const gasUsed = receipt.gasUsed * receipt.gasPrice;

			const balAfter = await ethers.provider.getBalance(clientAddr);
			expect(balAfter - balBefore + gasUsed).to.equal(AMOUNT);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(6); // CANCELLED
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
			expect(c.status).to.equal(6); // CANCELLED
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
			expect(c.status).to.equal(4); // DISPUTED
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
		async function getArbSigner() {
			const arbSigner = await ethers.getImpersonatedSigner(await arbitration.getAddress());
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

	describe("Revert Cases", function () {
		it("should revert createContract with zero address freelancer", async function () {
			await expect(
				trustLedger.connect(client).createContract(
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
					0n,
					{ value: AMOUNT },
				),
			).to.be.revertedWithCustomError(trustLedger, "ZeroAddress");
		});

		it("should revert createContract with self as freelancer", async function () {
			await expect(
				trustLedger.connect(client).createContract(
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
					ethers.ZeroAddress,
					0n,
					{ value: 0 },
				),
			).to.be.revertedWithCustomError(trustLedger, "InsufficientFunds");
		});

		it("should revert acceptContract when not freelancer", async function () {
			const id = await createContract();
			const { v, r, s } = await signAccept(id);
			// Caller is stranger (not the freelancer) → Unauthorized.
			await expect(
				trustLedger.connect(stranger).acceptContract(id, v, r, s),
			).to.be.revertedWithCustomError(trustLedger, "Unauthorized");
		});

		it("should revert acceptContract with bad signature", async function () {
			const id = await createContract();
			// Sign with a wrong address — ecrecover will return a different address.
			const wrongSig = await stranger.signMessage(ethers.toUtf8Bytes("wrong message"));
			const { v, r, s } = ethers.Signature.from(wrongSig);
			await expect(
				trustLedger.connect(freelancer).acceptContract(id, v, r, s),
			).to.be.revertedWithCustomError(trustLedger, "InvalidSignature");
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
				trustLedger.connect(stranger).executeRuling(id, 50n),
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
				trustLedger.connect(client).createContract(
					await freelancer.getAddress(),
					CONTRACT_HASH,
					"ipfs://",
					ESTIMATED_DURATION,
					1000n,
					ACCEPTANCE_WINDOW,
					ARB_FEE_BPS,
					0,
					0,
					ethers.ZeroAddress,
					0n,
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
					3600n,
					ARB_FEE_BPS,
					0,
					0,
					ethers.ZeroAddress,
					0n,
					{ value: AMOUNT },
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
});
