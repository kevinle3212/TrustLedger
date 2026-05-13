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

		const tx = await trustLedger.connect(client).createContract(
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
		const innerHash = ethers.solidityPackedKeccak256(
			["uint256", "address"],
			[id, freelancerAddr],
		);

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
				trustLedger
					.connect(client)
					.createContract(
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
				trustLedger
					.connect(client)
					.createContract(
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
				trustLedger
					.connect(client)
					.createContract(
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
				trustLedger
					.connect(client)
					.createContract(
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
				trustLedger
					.connect(client)
					.createContract(
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

			// Mint tokens to client and approve TrustLedger
			await token.mint(await client.getAddress(), TOKEN_AMOUNT * 10n);
			await token.connect(client).approve(await trustLedger.getAddress(), TOKEN_AMOUNT * 10n);
		});

		async function createERC20Contract(opts?: {
			holdBackBps?: number;
			warrantyPeriod?: bigint;
		}) {
			const holdBack = opts?.holdBackBps ?? 0;
			const warranty = opts?.warrantyPeriod ?? 0n;

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
					await token.getAddress(),
					TOKEN_AMOUNT,
					{ value: 0n },
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

		it("should pull tokens from client on createContract", async function () {
			const contractAddr = await trustLedger.getAddress();
			const before = await token.balanceOf(contractAddr);

			await createERC20Contract();

			expect((await token.balanceOf(contractAddr)) - before).to.equal(TOKEN_AMOUNT);
			const c = await trustLedger.getContract(0n);
			expect(c.token).to.equal(await token.getAddress());
			expect(c.amount).to.equal(TOKEN_AMOUNT);
		});

		it("should pay freelancer in tokens on approval", async function () {
			const id = await createERC20Contract();
			const { v, r, s } = await signAccept(id);
			await trustLedger.connect(freelancer).acceptContract(id, v, r, s);
			await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");

			const freelancerAddr = await freelancer.getAddress();
			const before = await token.balanceOf(freelancerAddr);
			await trustLedger.connect(client).approveWork(id);
			expect((await token.balanceOf(freelancerAddr)) - before).to.equal(TOKEN_AMOUNT);
		});

		it("should refund tokens to client on rejection", async function () {
			const id = await createERC20Contract();
			const clientAddr = await client.getAddress();
			const before = await token.balanceOf(clientAddr);
			await trustLedger.connect(freelancer).rejectContract(id);
			expect((await token.balanceOf(clientAddr)) - before).to.equal(TOKEN_AMOUNT);
		});

		it("should refund tokens to client on cancelPending", async function () {
			const id = await createERC20Contract();
			const clientAddr = await client.getAddress();
			const before = await token.balanceOf(clientAddr);
			await trustLedger.connect(client).cancelPending(id);
			expect((await token.balanceOf(clientAddr)) - before).to.equal(TOKEN_AMOUNT);
		});

		it("should hold back tokens correctly on approval with warranty", async function () {
			const id = await createERC20Contract({
				holdBackBps: 1000,
				warrantyPeriod: 7n * 24n * 3600n,
			});
			const { v, r, s } = await signAccept(id);
			await trustLedger.connect(freelancer).acceptContract(id, v, r, s);
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
			const { v, r, s } = await signAccept(id);
			await trustLedger.connect(freelancer).acceptContract(id, v, r, s);
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
			const { v, r, s } = await signAccept(id);
			await trustLedger.connect(freelancer).acceptContract(id, v, r, s);
			await trustLedger.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");

			const feePool = ethers.parseEther("0.1");
			await trustLedger.connect(client).disputeWork(id, { value: feePool });

			const arbSigner = await ethers.getImpersonatedSigner(await arbitration.getAddress());
			await ethers.provider.send("hardhat_setBalance", [
				await arbitration.getAddress(),
				"0x56BC75E2D630FFFFF",
			]);

			const freelancerAddr = await freelancer.getAddress();
			const before = await token.balanceOf(freelancerAddr);
			// 100% → all tokens to freelancer (feePool was in ETH, all tokens distributable)
			await trustLedger.connect(arbSigner).executeRuling(id, 100n);
			expect((await token.balanceOf(freelancerAddr)) - before).to.equal(TOKEN_AMOUNT);
		});

		it("should revert createContract when ETH sent with token escrow", async function () {
			await expect(
				trustLedger
					.connect(client)
					.createContract(
						await freelancer.getAddress(),
						CONTRACT_HASH,
						"ipfs://",
						ESTIMATED_DURATION,
						BUFFER_FACTOR,
						ACCEPTANCE_WINDOW,
						ARB_FEE_BPS,
						0,
						0,
						await token.getAddress(),
						TOKEN_AMOUNT,
						{ value: ethers.parseEther("1") },
					),
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
			const id = await createContract();
			const c = await trustLedger.getContract(id);
			// usdValueAtCreation = (1 ETH × 3000e8) / 1e18 = 3000e8 / 1e10 = 300000
			const expected = (AMOUNT * ETH_PRICE_USD) / 10n ** 18n;
			expect(c.usdValueAtCreation).to.equal(expected);
		});

		it("should store usdValueAtCreation = 0 when price feed returns ≤ 0", async function () {
			await priceFeed.setPrice(0);
			const id = await createContract();
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

			// stranger (signers[2]) was not pre-selected — must revert
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

		// Helpers for the commit-reveal flow
		function makeCommitment(
			disputeId: bigint,
			juror: string,
			pct: number,
			salt: string,
		): string {
			return ethers.solidityPackedKeccak256(
				["uint256", "address", "uint256", "bytes32"],
				[disputeId, juror, pct, ethers.encodeBytes32String(salt)],
			);
		}

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

			// Verify TrustLedger contract is RESOLVED
			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(5n); // RESOLVED

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

			// All 3 jurors are majority — each gets feePool/3
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
		let jurors: Signer[];

		function makeCommitment(
			disputeId: bigint,
			juror: string,
			pct: number,
			salt: string,
		): string {
			return ethers.solidityPackedKeccak256(
				["uint256", "address", "uint256", "bytes32"],
				[disputeId, juror, pct, ethers.encodeBytes32String(salt)],
			);
		}

		async function runDisputeToFinalized(
			contractId: bigint,
			disputeId: bigint,
			panel: Signer[],
			votes: number[],
		): Promise<bigint> {
			const salts = votes.map((unusedVote, i) => `salt${String(i)}`);
			for (let i = 0; i < panel.length; i++) {
				const addr = await panel[i].getAddress();
				await arbitration
					.connect(panel[i])
					.commitVote(disputeId, makeCommitment(disputeId, addr, votes[i], salts[i]));
			}
			await arbitration.advanceToReveal(disputeId);
			for (let i = 0; i < panel.length; i++) {
				await arbitration
					.connect(panel[i])
					.revealVote(disputeId, votes[i], ethers.encodeBytes32String(salts[i]));
			}
			const d = await arbitration.getDispute(disputeId);
			await ethers.provider.send("evm_setNextBlockTimestamp", [Number(d.phaseDeadline) + 1]);
			await ethers.provider.send("evm_mine", []);
			await arbitration.finalizeDispute(disputeId);
			const df = await arbitration.getDispute(disputeId);
			return df.ruling;
		}

		beforeEach(async function () {
			// Register 6 jurors (3 for original, 3 fresh for appeal since originals are excluded)
			const allSigners = await ethers.getSigners();
			jurors = allSigners.slice(3, 9);
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

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [30, 30, 30]);
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

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [30, 30, 30]);

			await expect(
				arbitration.connect(client).appeal(disputeId, { value: 1n }),
			).to.be.revertedWithCustomError(arbitration, "InsufficientAppealBond");
		});

		it("should revert appeal after window has elapsed", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [30, 30, 30]);
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

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [30, 30, 30]);
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

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [30, 30, 30]);
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
			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [30, 30, 30]);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;

			const clientAddr = await client.getAddress();
			await arbitration.connect(client).appeal(disputeId, { value: bond });

			// Appeal dispute = disputeId 1; use fresh jurors (3-5 are original, use 3-5 which are excluded → use 3-5+3=6-8 but we only have 3-8)
			// Actually, original jurors were jurors.slice(0,3) = signers[3,4,5]. Appeal must use different jurors.
			// jurors.slice(3,6) = signers[6,7,8] are fresh
			const appealDisputeId = 1n;
			const appealJurors = jurors.slice(3, 6);
			const clientBalBefore = await ethers.provider.getBalance(clientAddr);

			// Appeal ruling = 90 (changed from 30) → bond returned to client
			await runDisputeToFinalized(id, appealDisputeId, appealJurors, [90, 90, 90]);

			// After _resolveAppeal executes, client bond is returned and TrustLedger is resolved
			const clientBalAfter = await ethers.provider.getBalance(clientAddr);
			// Client gets bond back (90 ≠ 30)
			expect(clientBalAfter).to.be.gt(clientBalBefore);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(5n); // RESOLVED
		});

		it("should forfeit bond when appeal does not change ruling", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			// Original ruling = 50
			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [50, 50, 50]);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;

			await arbitration.connect(client).appeal(disputeId, { value: bond });

			// Appeal gives same ruling = 50 → bond forfeited (stays in feePool)
			const appealDisputeId = 1n;
			await runDisputeToFinalized(id, appealDisputeId, jurors.slice(3, 6), [50, 50, 50]);

			const c = await trustLedger.getContract(id);
			expect(c.status).to.equal(5n); // RESOLVED — ruling executed even when bond forfeited
		});

		it("should double maxJurors in appeal dispute", async function () {
			const id = await createAcceptAndSubmit();
			await trustLedger.connect(client).disputeWork(id);
			const disputeId = 0n;

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [50, 50, 50]);
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

			await runDisputeToFinalized(id, disputeId, jurors.slice(0, 3), [50, 50, 50]);
			const d = await arbitration.getDispute(disputeId);
			const bond = (d.feePool * 15000n) / 10000n;
			await arbitration.connect(client).appeal(disputeId, { value: bond });

			// Original juror tries to commit to the appeal dispute
			const appealDisputeId = 1n;
			const commitment = ethers.keccak256(ethers.toUtf8Bytes("test"));
			await expect(
				arbitration.connect(jurors[0]).commitVote(appealDisputeId, commitment),
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

			const arbSigner = await ethers.getImpersonatedSigner(await arbitration.getAddress());
			await ethers.provider.send("hardhat_setBalance", [
				await arbitration.getAddress(),
				"0x56BC75E2D630FFFFF",
			]);
			await trustLedger.connect(arbSigner).executeRuling(id, 50n);

			await expect(trustLedger.connect(client).submitRating(id, 50)).to.emit(
				trustLedger,
				"RatingSubmitted",
			);
		});

		it("should no-op submitRating when registry not set", async function () {
			// Deploy fresh TrustLedger without wiring up a registry
			const arb2Addr = ethers.getCreateAddress({
				from: await client.getAddress(),
				nonce: (await ethers.provider.getTransactionCount(await client.getAddress())) + 2,
			});
			const JRF = await ethers.getContractFactory("JurorRegistry", client);
			await JRF.deploy(arb2Addr); // must be deployed first so arb2Addr is a valid contract address
			const TLF = await ethers.getContractFactory("TrustLedger", client);
			const tl2 = (await TLF.deploy(arb2Addr)) as unknown as TrustLedger;

			const id = await (async () => {
				const tx = await tl2
					.connect(client)
					.createContract(
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
						{ value: AMOUNT },
					);
				const receipt = await tx.wait();
				const event = receipt?.logs
					.map((log) => {
						try {
							return tl2.interface.parseLog(log);
						} catch {
							return null;
						}
					})
					.find((e) => e?.name === "ContractCreated");
				return event?.args[0] as bigint;
			})();

			const { v, r, s } = await (async () => {
				const freelancerAddr = await freelancer.getAddress();
				const innerHash = ethers.solidityPackedKeccak256(
					["uint256", "address"],
					[id, freelancerAddr],
				);
				const sig = await freelancer.signMessage(ethers.getBytes(innerHash));
				return ethers.Signature.from(sig);
			})();

			await tl2.connect(freelancer).acceptContract(id, v, r, s);
			await tl2.connect(freelancer).submitProofOfWork(id, POW_HASH, "ipfs://QmPoW");
			await tl2.connect(client).approveWork(id);

			// No registry → silent no-op, no revert
			await expect(tl2.connect(client).submitRating(id, 80)).to.not.be.reverted;
		});

		it("should revert rate() when called directly (not from TrustLedger)", async function () {
			await expect(
				repRegistry.connect(stranger).rate(await freelancer.getAddress(), 80),
			).to.be.revertedWithCustomError(repRegistry, "OnlyTrustLedger");
		});

		it("should revert rate() with invalid score", async function () {
			// Call via impersonation of TrustLedger
			const tlSigner = await ethers.getImpersonatedSigner(await trustLedger.getAddress());
			await ethers.provider.send("hardhat_setBalance", [
				await trustLedger.getAddress(),
				"0x56BC75E2D630FFFFF",
			]);
			await expect(
				repRegistry.connect(tlSigner).rate(await freelancer.getAddress(), 0),
			).to.be.revertedWithCustomError(repRegistry, "InvalidScore");
			await expect(
				repRegistry.connect(tlSigner).rate(await freelancer.getAddress(), 101),
			).to.be.revertedWithCustomError(repRegistry, "InvalidScore");
		});
	});
});
