// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable use-natspec
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test} from "forge-std/Test.sol";
import {ReputationRegistry} from "../../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    ReputationRegistry public registry;

    address public trustLedger = makeAddr("trustLedger"); // simulates the TrustLedger contract
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        registry = new ReputationRegistry(trustLedger);
    }

    // ─── Constructor
    // ──────────────────────────────────────────────────────────

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert(ReputationRegistry.ZeroAddress.selector);
        new ReputationRegistry(address(0));
    }

    function test_Constructor_SetsImmutable() public view {
        assertEq(registry.TRUST_LEDGER(), trustLedger, "immutable mismatch");
    }

    // ─── Rate
    // ─────────────────────────────────────────────────────────────────

    function test_Rate_RecordsScore() public {
        vm.prank(trustLedger);
        registry.rate(user1, 80);

        (uint256 num, uint256 den) = registry.averageRating(user1);
        assertEq(num, 80, "numerator mismatch");
        assertEq(den, 1, "denominator mismatch");
    }

    function test_Rate_AccumulatesMultipleRatings() public {
        vm.prank(trustLedger);
        registry.rate(user1, 60);

        vm.prank(trustLedger);
        registry.rate(user1, 100);

        (uint256 num, uint256 den) = registry.averageRating(user1);
        assertEq(num, 160, "accumulated numerator mismatch");
        assertEq(den, 2, "accumulated denominator mismatch");
    }

    function test_Rate_OnlyTrustLedger_Reverts() public {
        vm.expectRevert(ReputationRegistry.OnlyTrustLedger.selector);
        vm.prank(stranger);
        registry.rate(user1, 80);
    }

    function test_Rate_ZeroScore_Reverts() public {
        vm.expectRevert(ReputationRegistry.InvalidScore.selector);
        vm.prank(trustLedger);
        registry.rate(user1, 0);
    }

    function test_Rate_ScoreAbove100_Reverts() public {
        vm.expectRevert(ReputationRegistry.InvalidScore.selector);
        vm.prank(trustLedger);
        registry.rate(user1, 101);
    }

    function test_Rate_BoundaryScores() public {
        // Score 1 (minimum) and 100 (maximum) should both succeed.
        vm.prank(trustLedger);
        registry.rate(user1, 1);

        vm.prank(trustLedger);
        registry.rate(user2, 100);

        (uint256 num1,) = registry.averageRating(user1);
        (uint256 num2,) = registry.averageRating(user2);
        assertEq(num1, 1, "min score mismatch");
        assertEq(num2, 100, "max score mismatch");
    }

    function test_Rate_EmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit ReputationRegistry.Rated(user1, 90);
        vm.prank(trustLedger);
        registry.rate(user1, 90);
    }

    // ─── AverageRating
    // ────────────────────────────────────────────────────────

    function test_AverageRating_UnratedUser_ReturnsZero() public view {
        (uint256 num, uint256 den) = registry.averageRating(user1);
        assertEq(num, 0, "expected 0 numerator for unrated user");
        assertEq(den, 0, "expected 0 denominator for unrated user");
    }

    function test_AverageRating_IndependentPerUser() public {
        vm.prank(trustLedger);
        registry.rate(user1, 70);
        vm.prank(trustLedger);
        registry.rate(user2, 50);

        (uint256 num1, uint256 den1) = registry.averageRating(user1);
        (uint256 num2, uint256 den2) = registry.averageRating(user2);

        assertEq(num1, 70);
        assertEq(den1, 1);
        assertEq(num2, 50);
        assertEq(den2, 1);
    }

    // ─── Recovery
    // ─────────────────────────────────────────────────────────────

    function test_Recovery_LowScore_EntersPendingRecovery() public {
        vm.prank(trustLedger);
        registry.rate(user1, 30); // at threshold — triggers recovery

        (uint256 pending, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(pending, 1, "should have 1 pending recovery");
        assertEq(progress, 0, "progress should be 0");
    }

    function test_Recovery_ScoreAboveThreshold_NoPendingEffect() public {
        vm.prank(trustLedger);
        registry.rate(user1, 31); // just above low threshold — neutral

        (uint256 pending, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(pending, 0, "no pending recovery from neutral score");
        assertEq(progress, 0, "no progress from neutral score");
    }

    function test_Recovery_HighScore_NoEffect_WhenNoPending() public {
        vm.prank(trustLedger);
        registry.rate(user1, 90); // high score but no pending recovery

        (uint256 pending, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(pending, 0, "still no pending recovery");
        assertEq(progress, 0, "no progress should accumulate without pending recovery");
    }

    function test_Recovery_HighScore_AdvancesProgress() public {
        vm.prank(trustLedger);
        registry.rate(user1, 20); // enter recovery

        vm.prank(trustLedger);
        registry.rate(user1, 80); // first successful rating

        (, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(progress, 1, "progress should be 1 after one successful rating");
    }

    function test_Recovery_LowScore_ResetsProgress() public {
        vm.prank(trustLedger);
        registry.rate(user1, 20); // enter recovery

        vm.prank(trustLedger);
        registry.rate(user1, 80); // progress = 1

        vm.prank(trustLedger);
        registry.rate(user1, 10); // new low score — resets streak, adds another pending

        (uint256 pending, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(pending, 2, "should have 2 pending recoveries");
        assertEq(progress, 0, "streak should be reset by low score");
    }

    function test_Recovery_Completed_AppliesBonus() public {
        uint8 bonus = registry.RECOVERY_BONUS();

        vm.prank(trustLedger);
        registry.rate(user1, 20); // low score: total=20, count=1

        // Three successful ratings to complete one recovery.
        vm.prank(trustLedger);
        registry.rate(user1, 80); // total=100, count=2, progress=1
        vm.prank(trustLedger);
        registry.rate(user1, 90); // total=190, count=3, progress=2
        vm.prank(trustLedger);
        registry.rate(user1, 70); // total=260, count=4; recovery → bonus applied: total=310, count=5

        (uint256 pending, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(pending, 0, "pending recovery should be resolved");
        assertEq(progress, 0, "progress should reset after recovery");

        (uint256 num, uint256 den) = registry.averageRating(user1);
        assertEq(den, 5, "bonus should add one extra rating entry");
        assertEq(num, 20 + 80 + 90 + 70 + bonus, "bonus should be added to total");
    }

    function test_Recovery_Completed_EmitsEvent() public {
        uint8 bonus = registry.RECOVERY_BONUS();

        vm.prank(trustLedger);
        registry.rate(user1, 10); // enter recovery

        vm.prank(trustLedger);
        registry.rate(user1, 75);
        vm.prank(trustLedger);
        registry.rate(user1, 75);

        vm.expectEmit(true, false, false, true);
        emit ReputationRegistry.RecoveryAchieved(user1, bonus);

        vm.prank(trustLedger);
        registry.rate(user1, 75); // third successful — completes recovery
    }

    function test_Recovery_MultiplePendingRequireMultipleCompletions() public {
        uint8 required = registry.RECOVERY_CONTRACTS_REQUIRED();

        vm.prank(trustLedger);
        registry.rate(user1, 10); // pending=1

        vm.prank(trustLedger);
        registry.rate(user1, 5); // pending=2, progress reset

        // Complete first recovery (3 high scores).
        for (uint8 i = 0; i < required; ++i) {
            vm.prank(trustLedger);
            registry.rate(user1, 80);
        }

        (uint256 pending,) = registry.recoveryStatus(user1);
        assertEq(pending, 1, "one recovery resolved; one still pending");

        // Complete second recovery.
        for (uint8 i = 0; i < required; ++i) {
            vm.prank(trustLedger);
            registry.rate(user1, 80);
        }

        (uint256 pending2,) = registry.recoveryStatus(user1);
        assertEq(pending2, 0, "both recoveries resolved");
    }

    function test_RecoveryStatus_UnratedUser_ReturnsZero() public view {
        (uint256 pending, uint256 progress) = registry.recoveryStatus(user1);
        assertEq(pending, 0, "unrated user should have no pending recoveries");
        assertEq(progress, 0, "unrated user should have no recovery progress");
    }
}
