// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-strict-inequalities
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test, Vm} from "forge-std/Test.sol";
import {Arbitration} from "./../../src/Arbitration.sol";
import {JurorRegistry} from "./../../src/JurorRegistry.sol";
import {ReputationRegistry} from "./../../src/ReputationRegistry.sol";
import {TrustLedger} from "./../../src/TrustLedger.sol";

contract TrustLedgerTest is Test {
    // ── Test constants
    // ────────────────────────────────────────────────────────
    uint256 public constant AMOUNT = 1 ether;
    uint256 public constant ESTIMATED_DURATION = 30 days;
    uint256 public constant BUFFER_FACTOR = 1200; // 1.2× buffer
    uint256 public constant ACCEPTANCE_WINDOW = 48 hours;
    uint16 public constant ARB_FEE_BPS = 1000; // 10% juror fee
    uint16 public constant HOLD_BACK_BPS = 1000; // 10% warranty hold-back
    uint64 public constant WARRANTY_PERIOD = 7 days;

    bytes32 public constant CONTRACT_HASH = keccak256("contract-doc");
    string public constant CONTRACT_URI = "ipfs://QmContractHash";
    bytes32 public constant POW_HASH = keccak256("proof-of-work");
    string public constant POW_URI = "ipfs://QmProofOfWork";

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;

    address public client = makeAddr("client");

    // The freelancer needs a private key (for ECDSA signing in acceptContract).
    // vm.createWallet gives us both the address and the key.
    Vm.Wallet internal _freelancerWallet;
    address public freelancer;

    address public stranger = makeAddr("stranger");

    // ── setUp
    // ─────────────────────────────────────────────────────────────────
    function setUp() public {
        _freelancerWallet = vm.createWallet("freelancer");
        freelancer = _freelancerWallet.addr;

        vm.deal(client, 100 ether);
        vm.deal(freelancer, 10 ether);
        vm.deal(stranger, 10 ether);

        // Precompute Arbitration address to break the circular dependency.
        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = computeCreateAddress(address(this), nonce + 2);

        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger = new TrustLedger(arbitrationAddr);
        arbitration = new Arbitration(address(trustLedger), address(jurorRegistry));

        assertEq(address(arbitration), arbitrationAddr, "address mismatch");
    }

    // ─── Signing helper
    // ───────────────────────────────────────────────────────
    // Computes the EIP-191 signed hash and signs it with the freelancer's private key.
    // This mirrors the on-chain ecrecover call inside acceptContract().
    function _signAccept(uint256 id) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 innerHash = keccak256(abi.encodePacked(id, freelancer));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash));
        (v, r, s) = vm.sign(_freelancerWallet.privateKey, ethSignedHash);
    }

    // ─── Lifecycle helpers
    // ────────────────────────────────────────────────────

    // Creates a contract with configurable hold-back and warranty.
    function _createContract(uint16 holdBackBps, uint64 warrantyPeriod) internal returns (uint256 id) {
        vm.prank(client);
        id = trustLedger.createContract{value: AMOUNT}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: holdBackBps,
            warrantyPeriod: warrantyPeriod,
            token: address(0),
            tokenAmount: // ETH escrow
            0 // no token amount
        });
    }

    // Creates a simple ETH contract with no hold-back.
    function _createSimpleContract() internal returns (uint256 id) {
        return _createContract(0, 0);
    }

    // Creates and has the freelancer accept (signs + calls acceptContract).
    function _createAndAccept() internal returns (uint256 id) {
        id = _createSimpleContract();
        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);
    }

    // Creates, accepts, and submits proof of work.
    function _createAcceptAndSubmit() internal returns (uint256 id) {
        id = _createAndAccept();
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
    }

    // ─── Happy Path
    // ───────────────────────────────────────────────────────────

    function test_HappyPath_CreateAcceptSubmitApprove() public {
        uint256 id = _createAcceptAndSubmit();

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.SUBMITTED));
        assertEq(c.proofOfWorkHash, POW_HASH);
        assertEq(c.proofOfWorkURI, POW_URI);

        uint256 freelancerBefore = freelancer.balance;
        vm.prank(client);
        trustLedger.approveWork(id);

        c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.APPROVED));
        assertEq(freelancer.balance, freelancerBefore + AMOUNT);
    }

    function test_HappyPath_WithHoldBack() public {
        uint256 id = _createContract(HOLD_BACK_BPS, WARRANTY_PERIOD);

        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);

        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);

        uint256 freelancerBefore = freelancer.balance;
        vm.prank(client);
        trustLedger.approveWork(id);

        uint256 holdBack = (AMOUNT * HOLD_BACK_BPS) / 10_000;
        uint256 payout = AMOUNT - holdBack;

        assertEq(freelancer.balance, freelancerBefore + payout, "partial payout mismatch");

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(c.holdBackAmount, holdBack, "holdback recorded mismatch");

        vm.expectRevert(TrustLedger.WindowNotElapsed.selector);
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);

        vm.warp(vm.getBlockTimestamp() + WARRANTY_PERIOD + 1);

        uint256 freelancerBefore2 = freelancer.balance;
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);
        assertEq(freelancer.balance, freelancerBefore2 + holdBack, "warranty claim mismatch");
    }

    // ─── Cancel Pending
    // ───────────────────────────────────────────────────────

    function test_CancelPending_RefundsClient() public {
        uint256 id = _createSimpleContract();
        uint256 clientBefore = client.balance;

        vm.prank(client);
        trustLedger.cancelPending(id);

        assertEq(client.balance, clientBefore + AMOUNT, "cancel refund mismatch");
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
    }

    function test_CancelPending_OnlyClient_Reverts() public {
        uint256 id = _createSimpleContract();
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger);
        trustLedger.cancelPending(id);
    }

    function test_CancelPending_WrongStatus_Reverts() public {
        uint256 id = _createAndAccept(); // already ACTIVE
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.ACTIVE));
        vm.prank(client);
        trustLedger.cancelPending(id);
    }

    // ─── Rejection
    // ────────────────────────────────────────────────────────────

    function test_Rejection_RefundsClient() public {
        uint256 id = _createSimpleContract();
        uint256 clientBefore = client.balance;

        vm.prank(freelancer);
        trustLedger.rejectContract(id);

        assertEq(client.balance, clientBefore + AMOUNT, "refund mismatch");

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
    }

    // ─── Deadline Miss
    // ────────────────────────────────────────────────────────

    function test_DeadlineMiss_ClientReclaims() public {
        uint256 id = _createAndAccept();

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        uint256 deadline = c.projectDeadline;

        vm.expectRevert(TrustLedger.DeadlineNotElapsed.selector);
        vm.prank(client);
        trustLedger.claimAfterDeadlineMiss(id);

        vm.warp(deadline + 1);
        uint256 clientBefore = client.balance;
        vm.prank(client);
        trustLedger.claimAfterDeadlineMiss(id);

        assertEq(client.balance, clientBefore + AMOUNT, "reclaim mismatch");
        c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
    }

    // ─── Acceptance Window Auto-Release
    // ───────────────────────────────────────

    function test_AcceptanceWindowAutoRelease() public {
        uint256 id = _createAcceptAndSubmit();

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        uint256 deadline = c.acceptanceDeadline;

        vm.expectRevert(TrustLedger.WindowNotElapsed.selector);
        vm.prank(freelancer);
        trustLedger.claimAfterAcceptanceWindow(id);

        vm.warp(deadline + 1);
        uint256 freelancerBefore = freelancer.balance;
        vm.prank(freelancer);
        trustLedger.claimAfterAcceptanceWindow(id);

        assertEq(freelancer.balance, freelancerBefore + AMOUNT, "auto-release mismatch");
    }

    // ─── Dispute Opening
    // ──────────────────────────────────────────────────────

    function test_DisputeOpening_FeePoolSentToArbitration() public {
        uint256 id = _createAcceptAndSubmit();

        uint256 arbBefore = address(arbitration).balance;
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        assertEq(address(arbitration).balance, arbBefore + feePool, "fee pool mismatch");

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.DISPUTED));
    }

    // ─── ExecuteRuling
    // ────────────────────────────────────────────────────────

    function test_ExecuteRuling_0pct_ClientWins() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 clientBefore = client.balance;
        uint256 freelancerBefore = freelancer.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 0);

        assertEq(client.balance, clientBefore + remaining, "client payout 0pct mismatch");
        assertEq(freelancer.balance, freelancerBefore, "freelancer should get 0 at 0pct");
    }

    function test_ExecuteRuling_100pct_FreelancerWins() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 100);

        assertEq(freelancer.balance, freelancerBefore + remaining, "freelancer 100pct mismatch");
        assertEq(client.balance, clientBefore, "client should get 0 at 100pct");
    }

    function test_ExecuteRuling_50pct_PartialSplit() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        // Proportional formula: freelancer gets 2/3 of earned amount (pct × amount), minus their fee share.
        // pct=50 as integer → equivalent to (2/3) × (0.5 × amount); dividing by 300 gives the same result.
        //   rawPay              = (2 × 50 × amount) / 300  [= (2/3) × (0.5 × amount)]
        //   freelancerFeeBurden = (feePool × 50) / 100
        //   freelancerPay       = rawPay - freelancerFeeBurden
        uint256 rawPay = (2 * 50 * AMOUNT) / 300;
        uint256 freelancerFeeBurden = (feePool * 50) / 100;
        uint256 expectedFreelancerPay = rawPay - freelancerFeeBurden;
        uint256 expectedClientRefund = remaining - expectedFreelancerPay;

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 50);

        assertEq(freelancer.balance, freelancerBefore + expectedFreelancerPay, "freelancer 50pct mismatch");
        assertEq(client.balance, clientBefore + expectedClientRefund, "client 50pct mismatch");
        assertEq(expectedFreelancerPay + expectedClientRefund, remaining, "payout conservation mismatch");
    }

    function test_ExecuteRuling_PayoutMathConservation(uint8 completionPct) public {
        vm.assume(completionPct <= 100);

        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, completionPct);

        uint256 freelancerGot = freelancer.balance - freelancerBefore;
        uint256 clientGot = client.balance - clientBefore;

        assertEq(freelancerGot + clientGot, remaining, "payout conservation failed");
    }

    // ─── Revert Conditions
    // ────────────────────────────────────────────────────

    function test_Revert_CreateContract_ZeroAddress() public {
        vm.expectRevert(TrustLedger.ZeroAddress.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: address(0),
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_SelfContract() public {
        vm.expectRevert(TrustLedger.SelfContract.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: client,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_ZeroValue() public {
        vm.expectRevert(TrustLedger.InsufficientFunds.selector);
        vm.prank(client);
        trustLedger.createContract{value: 0}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_InvalidBufferFactor() public {
        vm.expectRevert(TrustLedger.InvalidBufferFactor.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: 1000,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_InvalidAcceptanceWindow() public {
        vm.expectRevert(TrustLedger.InvalidAcceptanceWindow.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: 1 hours,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_InvalidArbitrationFee() public {
        vm.expectRevert(TrustLedger.InvalidArbitrationFee.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: 0,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_InvalidHoldBack() public {
        vm.expectRevert(TrustLedger.InvalidHoldBack.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 100,
            warrantyPeriod: 7 days,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_CreateContract_HoldBackWithoutWarranty() public {
        vm.expectRevert(TrustLedger.InvalidWarrantyPeriod.selector);
        vm.prank(client);
        trustLedger.createContract{value: AMOUNT}({
            freelancer: freelancer,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 1000,
            warrantyPeriod: 0,
            token: address(0),
            tokenAmount: 0
        });
    }

    function test_Revert_AcceptContract_WrongCaller() public {
        uint256 id = _createSimpleContract();
        // Signature is valid (signed by freelancer) but msg.sender is stranger → Unauthorized.
        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger);
        trustLedger.acceptContract(id, v, r, s);
    }

    function test_Revert_AcceptContract_BadSignature() public {
        uint256 id = _createSimpleContract();
        // Sign with the wrong private key → ecrecover returns a different address → InvalidSignature.
        Vm.Wallet memory wrongWallet = vm.createWallet("stranger");
        bytes32 innerHash = keccak256(abi.encodePacked(id, freelancer));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongWallet.privateKey, ethSignedHash);
        vm.expectRevert(TrustLedger.InvalidSignature.selector);
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);
    }

    function test_Revert_AcceptContract_WrongStatus() public {
        uint256 id = _createAndAccept(); // now ACTIVE
        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.ACTIVE));
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);
    }

    function test_Revert_ApproveWork_WrongCaller() public {
        uint256 id = _createAcceptAndSubmit();
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger);
        trustLedger.approveWork(id);
    }

    function test_Revert_ApproveWork_WindowElapsed() public {
        uint256 id = _createAcceptAndSubmit();
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        vm.warp(c.acceptanceDeadline + 1);

        vm.expectRevert(TrustLedger.WindowElapsed.selector);
        vm.prank(client);
        trustLedger.approveWork(id);
    }

    function test_Revert_DisputeWork_WrongStatus() public {
        uint256 id = _createSimpleContract();
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.PENDING));
        vm.prank(client);
        trustLedger.disputeWork(id);
    }

    function test_Revert_ExecuteRuling_NotArbitration() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        vm.expectRevert(TrustLedger.Unauthorized.selector);
        vm.prank(stranger);
        trustLedger.executeRuling(id, 50);
    }

    function test_Revert_ExecuteRuling_InvalidPct() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        vm.expectRevert(TrustLedger.CompletionPctOutOfRange.selector);
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 101);
    }

    function test_Revert_SubmitPoW_AfterDeadline() public {
        uint256 id = _createAndAccept();
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        vm.warp(c.projectDeadline + 1);

        vm.expectRevert(TrustLedger.DeadlineElapsed.selector);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
    }

    function test_Revert_ClaimWarranty_NoHoldBack() public {
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.approveWork(id);

        vm.expectRevert(TrustLedger.InvalidHoldBack.selector);
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);
    }

    // ─── Rating
    // ───────────────────────────────────────────────────────────────

    function test_SubmitRating_NoOp_WhenRegistryNotSet() public {
        // reputationRegistry is address(0) → submitRating silently returns.
        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.approveWork(id);

        // Should not revert even though registry is not wired in.
        vm.prank(client);
        trustLedger.submitRating(id, 80);
    }

    // ─── Auto reputation penalties
    // ────────────────────────────────────────────

    // Helper: deploy and wire a ReputationRegistry into trustLedger.
    function _deployRepRegistry() internal returns (ReputationRegistry result) {
        ReputationRegistry r = new ReputationRegistry(address(trustLedger));
        trustLedger.initReputationRegistry(address(r));
        return r;
    }

    function test_ExecuteRuling_FrivolousDispute_ClientAutoRated() public {
        ReputationRegistry repRegistry = _deployRepRegistry();

        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        // Ruling at the FRIVOLOUS_DISPUTE_THRESHOLD (80) → client penalized.
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 80);

        (uint256 num, uint256 den) = repRegistry.averageRating(client);
        assertEq(den, 1, "client should have exactly 1 auto-rating");
        assertEq(num, 1, "auto-rating score should be 1");
    }

    function test_ExecuteRuling_PoorWork_FreelancerAutoRated() public {
        ReputationRegistry repRegistry = _deployRepRegistry();

        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        // Ruling at the POOR_WORK_THRESHOLD (20) → freelancer penalized.
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 20);

        (uint256 num, uint256 den) = repRegistry.averageRating(freelancer);
        assertEq(den, 1, "freelancer should have exactly 1 auto-rating");
        assertEq(num, 1, "auto-rating score should be 1");
    }

    function test_ExecuteRuling_MidRange_NoPenalty() public {
        ReputationRegistry repRegistry = _deployRepRegistry();

        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        // Ruling in the neutral band (21-79) → no automatic penalty.
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 50);

        (, uint256 clientDen) = repRegistry.averageRating(client);
        (, uint256 freelancerDen) = repRegistry.averageRating(freelancer);
        assertEq(clientDen, 0, "client should have no auto-ratings");
        assertEq(freelancerDen, 0, "freelancer should have no auto-ratings");
    }

    function test_ExecuteRuling_FrivolousDispute_BlocksClientRating() public {
        _deployRepRegistry();

        uint256 id = _createAcceptAndSubmit();
        vm.prank(client);
        trustLedger.disputeWork(id);

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 90); // above threshold → _clientRated[id] = true

        // Client must not be able to override the auto-penalty with a favourable rating.
        vm.expectRevert(TrustLedger.RatingAlreadySubmitted.selector);
        vm.prank(client);
        trustLedger.submitRating(id, 100);
    }

    // ─── Next ID increments
    // ───────────────────────────────────────────────────

    function test_NextId_Increments() public {
        assertEq(trustLedger.nextId(), 0);
        _createSimpleContract();
        assertEq(trustLedger.nextId(), 1);
        _createSimpleContract();
        assertEq(trustLedger.nextId(), 2);
    }
}
