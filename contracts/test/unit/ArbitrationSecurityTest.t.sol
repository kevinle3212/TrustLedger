// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test} from "forge-std/Test.sol";
import {Arbitration} from "../../src/Arbitration.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";
import {MockVRFCoordinator} from "../../src/mocks/MockVRFCoordinator.sol";
import {TrustLedger} from "../../src/TrustLedger.sol";

/// @title ArbitrationSecurityTest
/// @author Kevin Le
/// @notice Focused regression tests for the security-fix branch: gated initializers,
///         appeal fee-pool solvency (no double-count), slashed-ETH exit path, bounded
///         juror selection over the active set, and the all-no-reveal rescue path.
contract ArbitrationSecurityTest is Test {
    uint256 public constant AMOUNT = 1 ether;
    uint256 public constant ESTIMATED_DURATION = 30 days;
    uint256 public constant BUFFER_FACTOR = 1200;
    uint256 public constant ACCEPTANCE_WINDOW = 48 hours;
    uint16 public constant ARB_FEE_BPS = 1000; // 10%
    bytes32 public constant CONTRACT_HASH = keccak256("contract-doc");
    string public constant CONTRACT_URI = "ipfs://doc";
    bytes32 public constant POW_HASH = keccak256("pow");
    string public constant POW_URI = "ipfs://pow";

    uint256 public constant JUROR_STAKE = 1 ether;

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;
    MockVRFCoordinator public vrf;

    address public deployer = address(this);
    address public attacker = makeAddr("attacker");
    address public client = makeAddr("client");
    address public freelancer = makeAddr("freelancer");

    function setUp() public {
        vm.deal(client, 100 ether);
        vm.deal(freelancer, 10 ether);
        vm.deal(attacker, 100 ether);

        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = vm.computeCreateAddress(address(this), nonce + 2);

        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger = new TrustLedger(arbitrationAddr);
        arbitration = new Arbitration(address(trustLedger), address(jurorRegistry));
        assertEq(address(arbitration), arbitrationAddr, "address mismatch");

        vrf = new MockVRFCoordinator();
    }

    // ─── #1 Initializer access control
    // ────────────────────────────────────────────

    function test_InitVrfCoordinator_OnlyDeployer() public {
        vm.expectRevert(Arbitration.NotDeployer.selector);
        vm.prank(attacker);
        arbitration.initVrfCoordinator(address(vrf));
    }

    function test_InitVrfCoordinator_DeployerSucceeds() public {
        arbitration.initVrfCoordinator(address(vrf));
        assertEq(arbitration.vrfCoordinator(), address(vrf));
    }

    function test_InitVrfCoordinator_CannotResetAfterSet() public {
        arbitration.initVrfCoordinator(address(vrf));
        vm.expectRevert(Arbitration.AlreadySet.selector);
        arbitration.initVrfCoordinator(address(0xBEEF));
    }

    function test_TrustLedgerInitializers_OnlyDeployer() public {
        vm.startPrank(attacker);
        vm.expectRevert(TrustLedger.NotDeployer.selector);
        trustLedger.initPauser(attacker);
        vm.expectRevert(TrustLedger.NotDeployer.selector);
        trustLedger.initPriceFeed(address(0xFEED));
        vm.expectRevert(TrustLedger.NotDeployer.selector);
        trustLedger.initReputationRegistry(address(0xCAFE));
        vm.stopPrank();
    }

    function test_TrustLedgerInitPauser_DeployerSucceeds() public {
        trustLedger.initPauser(deployer);
        assertEq(trustLedger.pauser(), deployer);
    }

    // ─── #5 Bounded / active-set juror selection
    // ──────────────────────────────────

    function test_ActiveSet_TracksRegistrationAndDeactivation() public {
        address j1 = _registerJuror("j1");
        address j2 = _registerJuror("j2");
        assertEq(jurorRegistry.activeJurorCount(), 2, "two active after register");

        // Withdraw below MIN_STAKE deactivates and removes from active set.
        vm.warp(vm.getBlockTimestamp() + 8 days); // pass stake lock
        vm.prank(j1);
        jurorRegistry.unstake(JUROR_STAKE);
        assertEq(jurorRegistry.activeJurorCount(), 1, "one active after unstake");

        address[] memory active = jurorRegistry.getActiveJurorList();
        assertEq(active.length, 1);
        assertEq(active[0], j2, "swap-and-pop kept j2");
    }

    function test_Selection_IgnoresChurnedJurors() public {
        // Register 3 real jurors, then create churn: many register+unstake cycles that
        // stay in the historical getJurorList() but leave the active set.
        address[] memory realJurors = new address[](5);
        for (uint256 i = 0; i < 5; ++i) {
            realJurors[i] = _registerJuror(string.concat("real", vm.toString(i)));
        }
        // Churn: 20 addresses register then fully unstake → inactive but in _jurorList.
        vm.warp(vm.getBlockTimestamp() + 1); // keep timestamps sane
        for (uint256 i = 0; i < 20; ++i) {
            address churner = makeAddr(string.concat("churn", vm.toString(i)));
            vm.deal(churner, 1 ether);
            vm.prank(churner);
            jurorRegistry.register{value: JUROR_STAKE}();
        }
        vm.warp(vm.getBlockTimestamp() + 8 days);
        for (uint256 i = 0; i < 20; ++i) {
            address churner = makeAddr(string.concat("churn", vm.toString(i)));
            vm.prank(churner);
            jurorRegistry.unstake(JUROR_STAKE);
        }

        // Historical list is inflated; active list is only the 5 real jurors.
        assertEq(jurorRegistry.getJurorList().length, 25, "historical list inflated");
        assertEq(jurorRegistry.activeJurorCount(), 5, "active set stays small");

        // Open a dispute (VRF mode) and confirm the committee is drawn from active jurors.
        arbitration.initVrfCoordinator(address(vrf));
        uint256 disputeId = _openDispute();
        uint256 reqId = vrf.lastRequestId();
        uint256[] memory words = new uint256[](1);
        words[0] = uint256(keccak256("seed"));
        vrf.fulfillWithWords(address(arbitration), reqId, words);

        address[] memory committee = arbitration.getJurors(disputeId);
        assertGt(committee.length, 0, "committee selected");
        uint256 committeeLength = committee.length;
        for (uint256 i = 0; i < committeeLength; ++i) {
            assertTrue(jurorRegistry.isEligible(committee[i]), "only eligible jurors selected");
        }
    }

    // ─── #8 Slashed ETH is forwarded to Arbitration, not stuck
    // ──────────────────

    function test_Slash_ForwardsEthToArbitration() public {
        address j = _registerJuror("solo");
        vm.warp(vm.getBlockTimestamp() + 8 days);

        uint256 registryBefore = address(jurorRegistry).balance;
        uint256 arbBefore = address(arbitration).balance;

        uint256 slashReq = 0.1 ether;
        vm.prank(address(arbitration));
        uint256 slashed = jurorRegistry.slash(j, slashReq);

        assertEq(slashed, slashReq, "returns actual slashed amount");
        assertEq(address(jurorRegistry).balance, registryBefore - slashReq, "registry ETH decreased");
        assertEq(address(arbitration).balance, arbBefore + slashReq, "arbitration received slashed ETH");
    }

    // ─── #4 Appeal fee pool never re-counts the original pool
    // ───────────────────

    function test_Appeal_DoesNotDoubleCountOriginalFeePool() public {
        _registerCommittee(6);
        uint256 disputeId = _openDispute(); // RANDAO path (no VRF)

        Arbitration.Dispute memory d = arbitration.getDispute(disputeId);
        uint256 origFeePool = d.feePool;
        assertGt(origFeePool, 0, "original fee pool funded");

        // Drive commit → reveal → finalize so an appeal can be filed.
        _commitRevealFinalize(disputeId, 100); // freelancer-favoured ruling

        d = arbitration.getDispute(disputeId);
        assertTrue(d.finalized, "finalized");

        // Client appeals with the required bond.
        uint256 required = (origFeePool * arbitration.APPEAL_BOND_MULTIPLIER_BPS()) / arbitration.BPS_DENOMINATOR();
        vm.prank(client);
        arbitration.appeal{value: required}(disputeId);

        d = arbitration.getDispute(disputeId);
        uint256 appealId = d.appealDisputeId;
        Arbitration.Dispute memory appealD = arbitration.getDispute(appealId);

        // The appeal pool must NOT be origFeePool + bond. It is funded only by slashed
        // ETH from the original dispute (real, held ETH), never re-counting origFeePool.
        assertLt(appealD.feePool, origFeePool + required, "appeal pool must not double-count");

        // Solvency invariant: Arbitration must actually hold ETH that covers every pool it
        // has independently promised — the original jurors' pool (origFeePool, still owed),
        // the appeal panel's pool (appealD.feePool), and the appeal bond held in escrow.
        assertGe(
            address(arbitration).balance,
            origFeePool + appealD.feePool + required,
            "arbitration must be solvent for all promised pools"
        );
    }

    // ─── #9 All-no-reveal pool is rescuable, not stuck
    // ──────────────────────────

    function test_Rescue_AllNoReveal_RefundsClient() public {
        _registerCommittee(4);
        uint256 disputeId = _openDispute();

        Arbitration.Dispute memory d = arbitration.getDispute(disputeId);
        uint256 feePool = d.feePool;
        assertGt(feePool, 0);

        // Advance to reveal, let NOBODY reveal, then finalize.
        vm.warp(vm.getBlockTimestamp() + arbitration.COMMIT_DURATION() + 1);
        arbitration.advanceToReveal(disputeId);
        vm.warp(vm.getBlockTimestamp() + arbitration.REVEAL_DURATION() + 1);
        arbitration.finalizeDispute(disputeId);

        // Pass the appeal window.
        vm.warp(vm.getBlockTimestamp() + arbitration.APPEAL_WINDOW() + 1);

        uint256 clientBefore = client.balance;
        uint256 arbBalBefore = address(arbitration).balance;

        arbitration.rescueUnclaimableFunds(disputeId);

        // The client (dispute funder) recovers at least the fee pool; slashed ETH from
        // no-reveal jurors is also folded in, so the refund is >= feePool.
        assertGe(client.balance - clientBefore, feePool, "client refunded at least fee pool");
        assertLe(address(arbitration).balance, arbBalBefore, "arbitration balance reduced");

        // Second rescue must revert.
        vm.expectRevert(Arbitration.NothingToRescue.selector);
        arbitration.rescueUnclaimableFunds(disputeId);
    }

    // ─── Helpers
    // ──────────────────────────────────────────────────────────────

    function _registerJuror(string memory label) internal returns (address juror) {
        juror = makeAddr(label);
        vm.deal(juror, 10 ether);
        vm.prank(juror);
        jurorRegistry.register{value: JUROR_STAKE}();
    }

    // Registers `n` jurors and warps past the stake-lock so they are eligible.
    function _registerCommittee(uint256 n) internal {
        for (uint256 i = 0; i < n; ++i) {
            _registerJuror(string.concat("j", vm.toString(i)));
        }
        vm.warp(vm.getBlockTimestamp() + jurorRegistry.STAKE_LOCK_PERIOD() + 1);
    }

    // Creates + funds + submits an escrow and opens a dispute; returns the disputeId.
    function _openDispute() internal returns (uint256 disputeId) {
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
        trustLedger.acceptContract{value: AMOUNT}(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
        vm.prank(client);
        trustLedger.disputeWork(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        disputeId = c.arbitrationId;
    }

    // Every selected juror commits and reveals `pct`, then the dispute is finalized.
    function _commitRevealFinalize(uint256 disputeId, uint256 pct) internal {
        address[] memory jurors = arbitration.getJurors(disputeId);
        bytes32 salt = keccak256("salt");
        uint256 jurorLength = jurors.length;
        for (uint256 i = 0; i < jurorLength; ++i) {
            bytes32 commitment = keccak256(abi.encodePacked(disputeId, jurors[i], pct, salt));
            vm.prank(jurors[i]);
            arbitration.commitVote(disputeId, commitment);
        }
        vm.warp(vm.getBlockTimestamp() + arbitration.COMMIT_DURATION() + 1);
        arbitration.advanceToReveal(disputeId);
        for (uint256 i = 0; i < jurorLength; ++i) {
            vm.prank(jurors[i]);
            arbitration.revealVote(disputeId, pct, salt);
        }
        vm.warp(vm.getBlockTimestamp() + arbitration.REVEAL_DURATION() + 1);
        arbitration.finalizeDispute(disputeId);
    }
}
