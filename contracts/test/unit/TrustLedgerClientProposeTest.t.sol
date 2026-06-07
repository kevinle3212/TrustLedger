// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-strict-inequalities
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test} from "forge-std/Test.sol";
import {Arbitration} from "./../../src/Arbitration.sol";
import {JurorRegistry} from "./../../src/JurorRegistry.sol";
import {TrustLedger} from "./../../src/TrustLedger.sol";

/// @notice Tests for the client-initiated proposal flow (proposeContractByClient).
///         New flow: client proposes (unfunded) → freelancer accepts → client funds → ACTIVE.
contract TrustLedgerClientProposeTest is Test {
    uint256 public constant AMOUNT = 1 ether;
    uint256 public constant ESTIMATED_DURATION = 30 days;
    uint256 public constant BUFFER_FACTOR = 1200;
    uint256 public constant ACCEPTANCE_WINDOW = 48 hours;
    uint16 public constant ARB_FEE_BPS = 1000;
    uint16 public constant HOLD_BACK_BPS = 1000;
    uint64 public constant WARRANTY_PERIOD = 7 days;

    bytes32 public constant CONTRACT_HASH = keccak256("contract-doc");
    string public constant CONTRACT_URI = "ipfs://QmContractHash";
    bytes32 public constant POW_HASH = keccak256("proof-of-work");
    string public constant POW_URI = "ipfs://QmProofOfWork";

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;

    address public client = makeAddr("client");
    address public freelancer = makeAddr("freelancer");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        vm.deal(client, 100 ether);
        vm.deal(freelancer, 10 ether);
        vm.deal(stranger, 10 ether);

        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = computeCreateAddress(address(this), nonce + 2);

        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger = new TrustLedger(arbitrationAddr);
        arbitration = new Arbitration(address(trustLedger), address(jurorRegistry));

        assertEq(address(arbitration), arbitrationAddr, "address mismatch");
    }

    // ── Helpers
    // ──────────────────────────────────────────────────────────────

    function _clientPropose(uint16 holdBackBps, uint64 warrantyPeriod) internal returns (uint256 id) {
        vm.prank(client);
        id = trustLedger.proposeContractByClient({
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
            amount: AMOUNT
        });
    }

    function _clientProposeSimple() internal returns (uint256 id) {
        return _clientPropose(0, 0);
    }

    function _clientProposeAndFreelancerAccept() internal returns (uint256 id) {
        id = _clientProposeSimple();
        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);
    }

    function _clientProposeAcceptAndFund() internal returns (uint256 id) {
        id = _clientProposeAndFreelancerAccept();
        vm.prank(client);
        trustLedger.fundContractByClient{value: AMOUNT}(id);
    }

    function _clientProposeAcceptFundSubmit() internal returns (uint256 id) {
        id = _clientProposeAcceptAndFund();
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
    }

    // ── Storage and event tests
    // ───────────────────────────────────────────────

    function test_ClientPropose_StoredCorrectly() public {
        uint256 id = _clientProposeSimple();
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        assertEq(c.client, client);
        assertEq(c.freelancer, freelancer);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.PENDING));
        assertTrue(c.proposedByClient, "proposedByClient should be true");
        assertFalse(c.freelancerAccepted, "freelancerAccepted should be false at proposal");
        assertEq(c.amount, AMOUNT);
        // No funds locked at proposal time.
        assertEq(address(trustLedger).balance, 0);
    }

    function test_ClientPropose_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit TrustLedger.ContractProposedByClient(0, client, freelancer, AMOUNT);
        vm.prank(client);
        trustLedger.proposeContractByClient({
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
            amount: AMOUNT
        });
    }

    // ── Freelancer accepts (sets flag, keeps PENDING until funded)
    // ───────────────────────────────────────────────────────────

    function test_FreelancerAccept_SetsFlag_RemainsPending() public {
        uint256 id = _clientProposeSimple();

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractAccepted(id);

        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        // Still PENDING — client hasn't funded yet.
        assertEq(uint8(c.status), uint8(TrustLedger.Status.PENDING));
        assertTrue(c.freelancerAccepted, "freelancerAccepted should be true");
        // No funds in escrow yet.
        assertEq(address(trustLedger).balance, 0);
    }

    // ── Client funds after freelancer accepts
    // ────────────────────────────────────────

    function test_ClientFund_MovesToActive() public {
        uint256 id = _clientProposeAndFreelancerAccept();

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractFundedByClient(id);

        vm.prank(client);
        trustLedger.fundContractByClient{value: AMOUNT}(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.ACTIVE));
        assertGt(c.projectDeadline, vm.getBlockTimestamp());
        assertEq(address(trustLedger).balance, AMOUNT);
    }

    // ── Full lifecycle
    // ────────────────────────────────────────────────────────

    function test_FullLifecycle_ClientPropose_Accept_Fund_Submit_Approve() public {
        uint256 id = _clientProposeAcceptFundSubmit();

        uint256 freelancerBefore = freelancer.balance;
        vm.prank(client);
        trustLedger.approveWork(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.APPROVED));
        assertEq(freelancer.balance, freelancerBefore + AMOUNT);
    }

    function test_FullLifecycle_ClientPropose_WithHoldBack() public {
        uint256 id = _clientPropose(HOLD_BACK_BPS, WARRANTY_PERIOD);
        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);
        vm.prank(client);
        trustLedger.fundContractByClient{value: AMOUNT}(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);

        uint256 holdBack = (AMOUNT * HOLD_BACK_BPS) / 10_000;
        uint256 immediatePayment = AMOUNT - holdBack;

        uint256 freelancerBefore = freelancer.balance;
        vm.prank(client);
        trustLedger.approveWork(id);

        assertEq(freelancer.balance, freelancerBefore + immediatePayment);

        // Advance past warranty and claim.
        vm.warp(vm.getBlockTimestamp() + WARRANTY_PERIOD + 1);
        vm.prank(freelancer);
        trustLedger.claimWarrantyFunds(id);
        assertEq(freelancer.balance, freelancerBefore + AMOUNT);
    }

    // ── Freelancer rejects (before accepting)
    // ───────────────────────────────────────

    function test_FreelancerReject_CancelsWithNoFunds() public {
        uint256 id = _clientProposeSimple();
        uint256 clientBefore = client.balance;

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractRejected(id);

        vm.prank(freelancer);
        trustLedger.rejectContractByFreelancer(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
        // No funds were ever locked, so balances are unchanged.
        assertEq(client.balance, clientBefore);
        assertEq(address(trustLedger).balance, 0);
    }

    // ── Client withdraws proposal (no funds to return)
    // ────────────────────────────────────────────────

    function test_ClientWithdraw_CancelsWithNoFunds() public {
        uint256 id = _clientProposeSimple();
        uint256 clientBefore = client.balance;

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractCancelled(id);

        vm.prank(client);
        trustLedger.withdrawClientProposal(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
        // No funds were ever locked.
        assertEq(client.balance, clientBefore);
    }

    function test_ClientWithdraw_AfterFreelancerAccept_StillCancels() public {
        uint256 id = _clientProposeAndFreelancerAccept();
        uint256 clientBefore = client.balance;

        vm.prank(client);
        trustLedger.withdrawClientProposal(id);

        assertEq(uint8(trustLedger.getContract(id).status), uint8(TrustLedger.Status.CANCELLED));
        assertEq(client.balance, clientBefore);
    }

    // ── linkAmendment across directions
    // ──────────────────────────────────────

    function test_LinkAmendment_ClientProposed_BothSides() public {
        // Client withdraws first proposal.
        uint256 oldId = _clientProposeSimple();
        vm.prank(client);
        trustLedger.withdrawClientProposal(oldId);

        // Client re-proposes with new terms.
        uint256 newId = _clientPropose(0, 0);

        vm.expectEmit(true, true, false, false);
        emit TrustLedger.ContractAmended(newId, oldId);

        vm.prank(client);
        trustLedger.linkAmendment(newId, oldId);

        assertEq(trustLedger.getContract(newId).previousContractId, oldId);
    }

    function test_LinkAmendment_Revert_WrongInitiator() public {
        uint256 oldId = _clientProposeSimple();
        vm.prank(client);
        trustLedger.withdrawClientProposal(oldId);

        uint256 newId = _clientProposeSimple();

        // Freelancer cannot link a client-proposed amendment.
        vm.prank(freelancer);
        vm.expectRevert(TrustLedger.InvalidPreviousContract.selector);
        trustLedger.linkAmendment(newId, oldId);
    }

    // ── Access control reverts
    // ────────────────────────────────────────────────

    function test_Revert_FreelancerAccept_NotFreelancer() public {
        uint256 id = _clientProposeSimple();
        vm.prank(stranger);
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        trustLedger.acceptContractByFreelancer(id);
    }

    function test_Revert_FreelancerAccept_AlreadyAccepted() public {
        uint256 id = _clientProposeSimple();
        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);
        // Cannot accept a second time.
        vm.prank(freelancer);
        vm.expectRevert(TrustLedger.AlreadySet.selector);
        trustLedger.acceptContractByFreelancer(id);
    }

    function test_Revert_FreelancerAccept_WrongStatus() public {
        uint256 id = _clientProposeAcceptAndFund();
        // Already ACTIVE — cannot accept again.
        vm.prank(freelancer);
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.ACTIVE));
        trustLedger.acceptContractByFreelancer(id);
    }

    function test_Revert_FreelancerAccept_NotClientProposed() public {
        // Create a freelancer-proposed contract.
        vm.prank(freelancer);
        uint256 id = trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            amount: AMOUNT
        });
        vm.prank(freelancer);
        vm.expectRevert(TrustLedger.NotClientProposed.selector);
        trustLedger.acceptContractByFreelancer(id);
    }

    function test_Revert_FreelancerReject_NotFreelancer() public {
        uint256 id = _clientProposeSimple();
        vm.prank(stranger);
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        trustLedger.rejectContractByFreelancer(id);
    }

    function test_Revert_FreelancerReject_AfterAccept() public {
        uint256 id = _clientProposeAndFreelancerAccept();
        // Cannot reject after having already accepted.
        vm.prank(freelancer);
        vm.expectRevert(TrustLedger.AlreadySet.selector);
        trustLedger.rejectContractByFreelancer(id);
    }

    function test_Revert_WithdrawClientProposal_NotClient() public {
        uint256 id = _clientProposeSimple();
        vm.prank(stranger);
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        trustLedger.withdrawClientProposal(id);
    }

    function test_Revert_WithdrawClientProposal_WrongStatus() public {
        uint256 id = _clientProposeAcceptAndFund();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.ACTIVE));
        trustLedger.withdrawClientProposal(id);
    }

    function test_Revert_WithdrawClientProposal_NotClientProposed() public {
        // Freelancer-proposed: client cannot use withdrawClientProposal.
        vm.prank(freelancer);
        uint256 id = trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            amount: AMOUNT
        });
        vm.prank(client);
        vm.expectRevert(TrustLedger.NotClientProposed.selector);
        trustLedger.withdrawClientProposal(id);
    }

    // ── fundContractByClient reverts
    // ─────────────────────────────────────────────

    function test_Revert_Fund_NotClient() public {
        uint256 id = _clientProposeAndFreelancerAccept();
        vm.prank(stranger);
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        trustLedger.fundContractByClient{value: AMOUNT}(id);
    }

    function test_Revert_Fund_FreelancerNotAcceptedYet() public {
        uint256 id = _clientProposeSimple();
        vm.prank(client);
        // freelancerAccepted is false → revert InvalidStatus
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.PENDING));
        trustLedger.fundContractByClient{value: AMOUNT}(id);
    }

    function test_Revert_Fund_WrongValue() public {
        uint256 id = _clientProposeAndFreelancerAccept();
        vm.prank(client);
        vm.expectRevert(TrustLedger.InsufficientFunds.selector);
        trustLedger.fundContractByClient{value: AMOUNT / 2}(id);
    }

    function test_Revert_Fund_WrongStatus() public {
        uint256 id = _clientProposeAcceptAndFund();
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(TrustLedger.InvalidStatus.selector, TrustLedger.Status.ACTIVE));
        trustLedger.fundContractByClient{value: AMOUNT}(id);
    }

    // Freelancer-proposed guards still reject the symmetric calls.
    function test_Revert_AcceptContract_ClientProposed() public {
        uint256 id = _clientProposeSimple();
        vm.prank(client);
        vm.expectRevert(TrustLedger.NotFreelancerProposed.selector);
        trustLedger.acceptContract{value: AMOUNT}(id);
    }

    function test_Revert_RejectContract_ClientProposed() public {
        uint256 id = _clientProposeSimple();
        vm.prank(client);
        vm.expectRevert(TrustLedger.NotFreelancerProposed.selector);
        trustLedger.rejectContract(id);
    }

    function test_Revert_CancelProposal_ClientProposed() public {
        uint256 id = _clientProposeSimple();
        vm.prank(freelancer);
        vm.expectRevert(TrustLedger.NotFreelancerProposed.selector);
        trustLedger.cancelProposal(id);
    }

    // ── Validation mirrors proposeContract
    // ───────────────────────────────────

    function test_Revert_ClientPropose_SelfContract() public {
        vm.prank(client);
        vm.expectRevert(TrustLedger.SelfContract.selector);
        trustLedger.proposeContractByClient({
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
            amount: AMOUNT
        });
    }

    // ── NextId increments for both propose functions
    // ──────────────────────────

    function test_NextId_IncrementsBoth() public {
        assertEq(trustLedger.nextId(), 0);
        _clientProposeSimple();
        assertEq(trustLedger.nextId(), 1);
        vm.prank(freelancer);
        trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            amount: AMOUNT
        });
        assertEq(trustLedger.nextId(), 2);
    }
}
