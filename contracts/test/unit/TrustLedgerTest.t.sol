// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-strict-inequalities
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test} from "forge-std/Test.sol";
import {TrustLedger} from "../../src/TrustLedger.sol";
import {Arbitration} from "../../src/Arbitration.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";

contract TrustLedgerTest is Test {

    // ── Test constants ────────────────────────────────────────────────────────
    // These match sensible defaults so helpers can reuse them without needing parameters.
    uint256 public constant AMOUNT             = 1 ether;
    uint256 public constant ESTIMATED_DURATION = 30 days;
    uint256 public constant BUFFER_FACTOR      = 1200;  // 1.2× — sets deadline 20% beyond estimated
    uint256 public constant ACCEPTANCE_WINDOW  = 48 hours;
    uint16  public constant ARB_FEE_BPS        = 1000;  // 10% juror fee
    uint16  public constant HOLD_BACK_BPS      = 1000;  // 10% warranty hold-back
    uint64  public constant WARRANTY_PERIOD    = 7 days;

    // Off-chain document hashes: keccak256 of a string literal evaluates at compile time.
    bytes32 public constant CONTRACT_HASH = keccak256("contract-doc");
    string  public constant CONTRACT_URI  = "ipfs://QmContractHash";
    bytes32 public constant POW_HASH      = keccak256("proof-of-work");
    string  public constant POW_URI       = "ipfs://QmProofOfWork";

    // Contract instances — redeployed fresh before each test via setUp().
    TrustLedger  public trustLedger;
    Arbitration  public arbitration;
    JurorRegistry public jurorRegistry;

    // Deterministic fake addresses for our three actors.
    address public client    = makeAddr("client");
    address public freelancer = makeAddr("freelancer");
    address public stranger  = makeAddr("stranger"); // not a party to any contract

    // ── setUp ─────────────────────────────────────────────────────────────────
    // Runs before EVERY test. Foundry snapshots state here and resets to it
    // before each test_, giving perfect isolation between tests.
    function setUp() public {
        // Give our fake addresses spendable ETH.
        vm.deal(client,    100 ether);
        vm.deal(freelancer, 10 ether);
        vm.deal(stranger,   10 ether);

        // ── Circular dependency solution ──────────────────────────────────────
        // TrustLedger needs Arbitration's address in its constructor (immutable).
        // Arbitration needs TrustLedger's address in its constructor (immutable).
        // Solution: precompute the address of the 3rd contract (nonce+2) before deploying.
        //
        // `address(this)` is the test contract — it's the deployer in Foundry tests.
        // `vm.getNonce(address(this))` returns how many contracts this test has deployed so far.
        uint256 nonce = vm.getNonce(address(this));

        // computeCreateAddress(deployer, nonce) mirrors the EVM's deterministic address formula.
        address arbitrationAddr = computeCreateAddress(address(this), nonce + 2);

        // Deploy in exact nonce order: registry (nonce), trustledger (nonce+1), arbitration (nonce+2).
        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger   = new TrustLedger(arbitrationAddr);
        arbitration   = new Arbitration(address(trustLedger), address(jurorRegistry));

        // Confirm the address prediction was correct.
        assertEq(address(arbitration), arbitrationAddr, "address mismatch");
    }

    // ─── Helper: create a contract ────────────────────────────────────────────
    // Private helpers reduce repetition in tests. These simulate the common
    // multi-step flows so each test can jump straight to the state it cares about.

    // Creates an escrow contract with customizable hold-back and warranty period.
    function _createContract(uint16 holdBackBps, uint64 warrantyPeriod) internal returns (uint256 id) {
        vm.prank(client); // next call is from `client`
        id = trustLedger.createContract{value: AMOUNT}(
            freelancer,
            CONTRACT_HASH,
            CONTRACT_URI,
            ESTIMATED_DURATION,
            BUFFER_FACTOR,
            ACCEPTANCE_WINDOW,
            ARB_FEE_BPS,
            holdBackBps,
            warrantyPeriod
        );
    }

    // Creates a simple contract with no hold-back (0 bps, 0 warranty).
    function _createSimpleContract() internal returns (uint256 id) {
        return _createContract(0, 0);
    }

    // Creates a contract AND has the freelancer accept it (PENDING → ACTIVE).
    function _createAndAccept() internal returns (uint256 id) {
        id = _createSimpleContract();
        vm.prank(freelancer);
        trustLedger.acceptContract(id);
    }

    // Creates, accepts, and submits proof of work (ACTIVE → SUBMITTED).
    function _createAcceptAndSubmit() internal returns (uint256 id) {
        id = _createAndAccept();
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
    }

    // ─── Happy Path ───────────────────────────────────────────────────────────

    // Tests the golden path: create → accept → submit → client approves → funds released.
    function test_HappyPath_CreateAcceptSubmitApprove() public {
        uint256 id = _createAcceptAndSubmit();

        // Verify the contract is in SUBMITTED state with the correct proof hash.
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.SUBMITTED));
        assertEq(c.proofOfWorkHash, POW_HASH);
        assertEq(c.proofOfWorkURI,  POW_URI);

        // Record balance before approval to measure exact payout.
        uint256 freelancerBefore = freelancer.balance;
        vm.prank(client);
        trustLedger.approveWork(id);

        c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.APPROVED));

        // With no hold-back, the freelancer receives the full AMOUNT.
        assertEq(freelancer.balance, freelancerBefore + AMOUNT);
    }

    // Tests the hold-back path: approval releases partial payment, rest released after warranty.
    function test_HappyPath_WithHoldBack() public {
        uint256 id = _createContract(HOLD_BACK_BPS, WARRANTY_PERIOD);

        vm.prank(freelancer);
        trustLedger.acceptContract(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);

        uint256 freelancerBefore = freelancer.balance;
        vm.prank(client);
        trustLedger.approveWork(id);

        uint256 holdBack = (AMOUNT * HOLD_BACK_BPS) / 10_000; // 10% of 1 ETH = 0.1 ETH
        uint256 payout   = AMOUNT - holdBack;                  // 0.9 ETH immediate payout

        assertEq(freelancer.balance, freelancerBefore + payout, "partial payout mismatch");

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(c.holdBackAmount, holdBack, "holdback recorded mismatch");

        // Before warranty expires, claiming should revert.
        vm.expectRevert(TrustLedger.WindowNotElapsed.selector);
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);

        // Fast-forward past warranty period.
        vm.warp(block.timestamp + WARRANTY_PERIOD + 1);

        uint256 freelancerBefore2 = freelancer.balance;
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);
        assertEq(freelancer.balance, freelancerBefore2 + holdBack, "warranty claim mismatch");
    }

    // ─── Rejection ────────────────────────────────────────────────────────────

    function test_Rejection_RefundsClient() public {
        uint256 id = _createSimpleContract();
        uint256 clientBefore = client.balance;

        vm.prank(freelancer);
        trustLedger.rejectContract(id);

        // Client receives full refund when freelancer rejects.
        assertEq(client.balance, clientBefore + AMOUNT, "refund mismatch");

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
    }

    // ─── Deadline Miss ────────────────────────────────────────────────────────

    function test_DeadlineMiss_ClientReclaims() public {
        uint256 id = _createAndAccept();

        // Read the actual deadline from storage (computed as timestamp + duration × buffer / 1000).
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        uint256 deadline = c.projectDeadline;

        // Before deadline: reclaim should revert.
        vm.expectRevert(TrustLedger.DeadlineNotElapsed.selector);
        vm.prank(client);
        trustLedger.claimAfterDeadlineMiss(id);

        // Warp to 1 second after deadline.
        vm.warp(deadline + 1);
        uint256 clientBefore = client.balance;
        vm.prank(client);
        trustLedger.claimAfterDeadlineMiss(id);

        assertEq(client.balance, clientBefore + AMOUNT, "reclaim mismatch");
        c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
    }

    // ─── Acceptance Window Auto-Release ───────────────────────────────────────

    function test_AcceptanceWindowAutoRelease() public {
        uint256 id = _createAcceptAndSubmit();

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        uint256 deadline = c.acceptanceDeadline;

        // Before window elapses, the freelancer can't self-release yet.
        vm.expectRevert(TrustLedger.WindowNotElapsed.selector);
        vm.prank(freelancer);
        trustLedger.claimAfterAcceptanceWindow(id);

        // After window, freelancer can claim (client didn't approve or dispute in time).
        vm.warp(deadline + 1);
        uint256 freelancerBefore = freelancer.balance;
        vm.prank(freelancer);
        trustLedger.claimAfterAcceptanceWindow(id);

        assertEq(freelancer.balance, freelancerBefore + AMOUNT, "auto-release mismatch");
    }

    // ─── Dispute Opening ──────────────────────────────────────────────────────

    function test_DisputeOpening_FeePoolSentToArbitration() public {
        uint256 id = _createAcceptAndSubmit();

        uint256 arbBefore = address(arbitration).balance;
        vm.prank(client);
        trustLedger.disputeWork(id);

        // The arbitration fee (10% of 1 ETH = 0.1 ETH) should be forwarded to Arbitration.
        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        assertEq(address(arbitration).balance, arbBefore + feePool, "fee pool mismatch");

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.DISPUTED));
    }

    // ─── ExecuteRuling ────────────────────────────────────────────────────────
    // These tests spoof Arbitration calling executeRuling by using vm.prank(address(arbitration)).
    // In production, Arbitration calls this; in tests we simulate it directly to check payout math.

    function test_ExecuteRuling_0pct_ClientWins() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool   = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 clientBefore     = client.balance;
        uint256 freelancerBefore = freelancer.balance;

        // 0% completion → client wins everything (freelancer gets 0).
        vm.prank(address(arbitration)); // pretend we're the Arbitration contract
        trustLedger.executeRuling(id, 0);

        assertEq(client.balance,     clientBefore + remaining, "client payout 0pct mismatch");
        assertEq(freelancer.balance, freelancerBefore,         "freelancer should get 0 at 0pct");
    }

    function test_ExecuteRuling_100pct_FreelancerWins() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool   = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore     = client.balance;

        // 100% completion → freelancer wins everything.
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 100);

        assertEq(freelancer.balance, freelancerBefore + remaining, "freelancer 100pct mismatch");
        assertEq(client.balance,     clientBefore,                 "client should get 0 at 100pct");
    }

    function test_ExecuteRuling_50pct_PartialSplit() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool   = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        // Formula: freelancerPay = (2 × completionPct × amount) / 300
        // At 50%: (2 × 50 × 1e18) / 300 ≈ 0.333 ETH
        uint256 expectedFreelancerPay = (2 * 50 * AMOUNT) / 300;
        uint256 expectedClientRefund  = remaining - expectedFreelancerPay;

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore     = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 50);

        assertEq(freelancer.balance, freelancerBefore + expectedFreelancerPay, "freelancer 50pct mismatch");
        assertEq(client.balance,     clientBefore + expectedClientRefund,       "client 50pct mismatch");
        // Sanity: payout is conserved (no ETH created or destroyed).
        assertEq(expectedFreelancerPay + expectedClientRefund, remaining, "payout conservation mismatch");
    }

    // Fuzz-lite test: runs with many values of completionPct to check conservation.
    // `vm.assume` is available in Foundry unit tests too — it skips inputs that don't satisfy the condition.
    function test_ExecuteRuling_PayoutMathConservation(uint8 completionPct) public {
        vm.assume(completionPct <= 100); // Foundry will try all uint8 values; assume filters invalid ones

        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool  = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore     = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, completionPct);

        uint256 freelancerGot = freelancer.balance - freelancerBefore;
        uint256 clientGot     = client.balance - clientBefore;

        // Conservation invariant: no ETH is lost or created.
        assertEq(freelancerGot + clientGot, remaining, "payout conservation failed");
    }

    // ─── Revert Conditions ────────────────────────────────────────────────────
    // These tests verify that every guarded action correctly rejects invalid callers or states.

    function test_Revert_CreateContract_ZeroAddress() public {
        vm.expectRevert(TrustLedger.ZeroAddress.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            address(0), CONTRACT_HASH, CONTRACT_URI, // freelancer = zero address
            ESTIMATED_DURATION, BUFFER_FACTOR, ACCEPTANCE_WINDOW,
            ARB_FEE_BPS, 0, 0
        );
    }

    function test_Revert_CreateContract_SelfContract() public {
        vm.expectRevert(TrustLedger.SelfContract.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            client, CONTRACT_HASH, CONTRACT_URI, // freelancer = client = hiring yourself
            ESTIMATED_DURATION, BUFFER_FACTOR, ACCEPTANCE_WINDOW,
            ARB_FEE_BPS, 0, 0
        );
    }

    function test_Revert_CreateContract_ZeroValue() public {
        vm.expectRevert(TrustLedger.InsufficientFunds.selector);
        vm.prank(client);
        trustLedger.createContract{value: 0}( // no ETH sent
            freelancer, CONTRACT_HASH, CONTRACT_URI,
            ESTIMATED_DURATION, BUFFER_FACTOR, ACCEPTANCE_WINDOW,
            ARB_FEE_BPS, 0, 0
        );
    }

    function test_Revert_CreateContract_InvalidBufferFactor() public {
        vm.expectRevert(TrustLedger.InvalidBufferFactor.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            freelancer, CONTRACT_HASH, CONTRACT_URI,
            ESTIMATED_DURATION, 1000, ACCEPTANCE_WINDOW, // 1000 = 1.0× (below 1.1× minimum)
            ARB_FEE_BPS, 0, 0
        );
    }

    function test_Revert_CreateContract_InvalidAcceptanceWindow() public {
        vm.expectRevert(TrustLedger.InvalidAcceptanceWindow.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            freelancer, CONTRACT_HASH, CONTRACT_URI,
            ESTIMATED_DURATION, BUFFER_FACTOR, 1 hours, // below 48h minimum
            ARB_FEE_BPS, 0, 0
        );
    }

    function test_Revert_CreateContract_InvalidArbitrationFee() public {
        vm.expectRevert(TrustLedger.InvalidArbitrationFee.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            freelancer, CONTRACT_HASH, CONTRACT_URI,
            ESTIMATED_DURATION, BUFFER_FACTOR, ACCEPTANCE_WINDOW,
            0, 0, 0 // fee bps = 0 is invalid (must be at least 1)
        );
    }

    function test_Revert_CreateContract_InvalidHoldBack() public {
        vm.expectRevert(TrustLedger.InvalidHoldBack.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            freelancer, CONTRACT_HASH, CONTRACT_URI,
            ESTIMATED_DURATION, BUFFER_FACTOR, ACCEPTANCE_WINDOW,
            ARB_FEE_BPS, 100, 7 days // 100 bps (1%) is below the 500 bps (5%) minimum
        );
    }

    function test_Revert_CreateContract_HoldBackWithoutWarranty() public {
        vm.expectRevert(TrustLedger.InvalidWarrantyPeriod.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}(
            freelancer, CONTRACT_HASH, CONTRACT_URI,
            ESTIMATED_DURATION, BUFFER_FACTOR, ACCEPTANCE_WINDOW,
            ARB_FEE_BPS, 1000, 0 // holdback set but warranty period is 0 — inconsistent
        );
    }

    function test_Revert_AcceptContract_WrongCaller() public {
        uint256 id = _createSimpleContract();
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger); // only the designated freelancer may accept
        trustLedger.acceptContract(id);
    }

    function test_Revert_AcceptContract_WrongStatus() public {
        uint256 id = _createAndAccept(); // contract is now ACTIVE, not PENDING
        // abi.encodeWithSelector creates the exact revert bytes including the error argument.
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.ACTIVE));
        vm.prank(freelancer);
        trustLedger.acceptContract(id); // can't accept an already-ACTIVE contract
    }

    function test_Revert_ApproveWork_WrongCaller() public {
        uint256 id = _createAcceptAndSubmit();
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger); // only the client may approve
        trustLedger.approveWork(id);
    }

    function test_Revert_ApproveWork_WindowElapsed() public {
        uint256 id = _createAcceptAndSubmit();
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        vm.warp(c.acceptanceDeadline + 1); // past the acceptance deadline

        vm.expectRevert(TrustLedger.WindowElapsed.selector);
        vm.prank(client);
        trustLedger.approveWork(id); // too late to approve
    }

    function test_Revert_DisputeWork_WrongStatus() public {
        uint256 id = _createSimpleContract(); // status = PENDING (not SUBMITTED)
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.PENDING));
        vm.prank(client);
        trustLedger.disputeWork(id); // can only dispute SUBMITTED contracts
    }

    function test_Revert_ExecuteRuling_NotArbitration() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger); // only ARBITRATION address can call executeRuling
        trustLedger.executeRuling(id, 50);
    }

    function test_Revert_ExecuteRuling_InvalidPct() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        vm.expectRevert(TrustLedger.CompletionPctOutOfRange.selector);
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 101); // 101% is invalid (max is 100)
    }

    function test_Revert_SubmitPoW_AfterDeadline() public {
        uint256 id = _createAndAccept();
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        vm.warp(c.projectDeadline + 1); // past the project deadline

        vm.expectRevert(TrustLedger.DeadlineElapsed.selector);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI); // too late
    }

    function test_Revert_ClaimWarranty_NoHoldBack() public {
        uint256 id = _createAcceptAndSubmit(); // no hold-back configured
        vm.prank(client);
        trustLedger.approveWork(id);

        // holdBackAmount == 0 → InvalidHoldBack
        vm.expectRevert(TrustLedger.InvalidHoldBack.selector);
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);
    }

    // ─── Next ID increments ───────────────────────────────────────────────────

    // Confirms that nextId is a monotonically increasing counter.
    function test_NextId_Increments() public {
        assertEq(trustLedger.nextId(), 0); // starts at 0
        _createSimpleContract();
        assertEq(trustLedger.nextId(), 1);
        _createSimpleContract();
        assertEq(trustLedger.nextId(), 2);
    }
}
