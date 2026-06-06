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
///         The symmetric path: client proposes + funds → freelancer accepts or rejects.
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
        id = trustLedger.proposeContractByClient{value: AMOUNT}({
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

    function _clientProposeAndAccept() internal returns (uint256 id) {
        id = _clientProposeSimple();
        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);
    }

    function _clientProposeAcceptSubmit() internal returns (uint256 id) {
        id = _clientProposeAndAccept();
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
        assertEq(c.amount, AMOUNT);
        // Escrow holds the funds immediately.
        assertEq(address(trustLedger).balance, AMOUNT);
    }

    function test_ClientPropose_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit TrustLedger.ContractProposedByClient(0, client, freelancer, AMOUNT);
        vm.prank(client);
        trustLedger.proposeContractByClient{value: AMOUNT}({
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

    // ── Happy path: freelancer accepts
    // ───────────────────────────────────────

    function test_FreelancerAccept_MovesToActive() public {
        uint256 id = _clientProposeSimple();

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractAccepted(id);

        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.ACTIVE));
        // projectDeadline should now be an absolute timestamp (> current block).
        assertGt(c.projectDeadline, vm.getBlockTimestamp());
        // Funds remain in escrow.
        assertEq(address(trustLedger).balance, AMOUNT);
    }

    function test_FullLifecycle_ClientPropose_Accept_Submit_Approve() public {
        uint256 id = _clientProposeAcceptSubmit();

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

    // ── Freelancer rejects
    // ────────────────────────────────────────────────────

    function test_FreelancerReject_ReturnsFundsToClient() public {
        uint256 id = _clientProposeSimple();
        uint256 clientBefore = client.balance;

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractRejected(id);

        vm.prank(freelancer);
        trustLedger.rejectContractByFreelancer(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
        assertEq(client.balance, clientBefore + AMOUNT);
        assertEq(address(trustLedger).balance, 0);
    }

    // ── Client withdraws proposal
    // ────────────────────────────────────────────

    function test_ClientWithdraw_ReturnsFunds() public {
        uint256 id = _clientProposeSimple();
        uint256 clientBefore = client.balance;

        vm.expectEmit(true, false, false, false);
        emit TrustLedger.ContractCancelled(id);

        vm.prank(client);
        trustLedger.withdrawClientProposal(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED));
        assertEq(client.balance, clientBefore + AMOUNT);
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

    function test_Revert_FreelancerAccept_WrongStatus() public {
        uint256 id = _clientProposeSimple();
        vm.prank(freelancer);
        trustLedger.acceptContractByFreelancer(id);
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

    function test_Revert_WithdrawClientProposal_NotClient() public {
        uint256 id = _clientProposeSimple();
        vm.prank(stranger);
        vm.expectRevert(TrustLedger.Unauthorized.selector);
        trustLedger.withdrawClientProposal(id);
    }

    function test_Revert_WithdrawClientProposal_WrongStatus() public {
        uint256 id = _clientProposeAndAccept();
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
        trustLedger.proposeContractByClient{value: AMOUNT}({
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

    function test_Revert_ClientPropose_WrongValue() public {
        vm.prank(client);
        vm.expectRevert(TrustLedger.InsufficientFunds.selector);
        trustLedger.proposeContractByClient{value: AMOUNT / 2}({
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
