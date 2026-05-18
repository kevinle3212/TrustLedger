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

    // setUp() deploys a fresh ReputationRegistry before every test.
    function setUp() public {
        registry = new ReputationRegistry(trustLedger);
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert(ReputationRegistry.ZeroAddress.selector);
        new ReputationRegistry(address(0));
    }

    function test_Constructor_SetsImmutable() public view {
        assertEq(registry.TRUST_LEDGER(), trustLedger, "immutable mismatch");
    }

    // ─── Rate ─────────────────────────────────────────────────────────────────

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
        // Average = 160 / 2 = 80
    }

    function test_Rate_OnlyTrustLedger_Reverts() public {
        // A stranger calling rate() should revert with OnlyTrustLedger.
        vm.expectRevert(ReputationRegistry.OnlyTrustLedger.selector);
        vm.prank(stranger);
        registry.rate(user1, 80);
    }

    function test_Rate_ZeroScore_Reverts() public {
        // Score 0 is invalid (range is [1, 100]).
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

    // ─── AverageRating ────────────────────────────────────────────────────────

    function test_AverageRating_UnratedUser_ReturnsZero() public view {
        // A user who has never been rated should return (0, 0).
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
}
