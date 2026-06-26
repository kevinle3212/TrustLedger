// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../../src/mocks/MockUSDC.sol";
import {StakingVault} from "../../src/StakingVault.sol";

/// @title StakingVaultTest
/// @author Kevin Le
/// @notice Foundry unit tests for the USDC staking vault. Exercises 6-decimal accounting,
///         reward accrual, withdrawals, error paths, pausing, and recovery.
contract StakingVaultTest is Test {
    uint256 public constant ONE_USDC = 1e6; // USDC has 6 decimals
    uint256 public constant DURATION = 7 days;

    MockUSDC public usdc;
    StakingVault public vault;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        usdc = new MockUSDC();
        // Stake and reward token are both USDC (single-asset staking vault).
        vault = new StakingVault(address(usdc), address(usdc), owner);

        usdc.mint(alice, 1000 * ONE_USDC);
        usdc.mint(bob, 1000 * ONE_USDC);

        vm.prank(alice);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(vault), type(uint256).max);
    }

    // Funds the vault with `reward` USDC and starts a distribution over the default duration.
    function _fundRewards(uint256 reward) internal {
        usdc.mint(address(vault), reward);
        vm.prank(owner);
        vault.notifyRewardAmount(reward);
    }

    // ─── Construction / metadata
    // ────────────────────────────────────────────

    function test_Constructor_StoresDecimals() public view {
        assertEq(vault.STAKING_TOKEN_DECIMALS(), 6);
        assertEq(address(vault.STAKING_TOKEN()), address(usdc));
        assertEq(address(vault.REWARDS_TOKEN()), address(usdc));
        assertEq(vault.owner(), owner);
    }

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert(StakingVault.ZeroAddress.selector);
        new StakingVault(address(0), address(usdc), owner);
    }

    // ─── Staking
    // ────────────────────────────────────────────────────────────

    function test_Stake_UpdatesBalances() public {
        vm.prank(alice);
        vault.stake(100 * ONE_USDC);

        assertEq(vault.balanceOf(alice), 100 * ONE_USDC);
        assertEq(vault.totalStaked(), 100 * ONE_USDC);
        assertEq(usdc.balanceOf(address(vault)), 100 * ONE_USDC);
    }

    function test_Stake_ZeroAmount_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vault.stake(0);
    }

    function test_Stake_InsufficientAllowance_Reverts() public {
        vm.prank(stranger);
        // stranger has no balance/allowance; SafeERC20 surfaces the token revert.
        vm.expectRevert();
        vault.stake(ONE_USDC);
    }

    // ─── Withdrawing
    // ──────────────────────────────────────────────────────────

    function test_Withdraw_ReturnsTokens() public {
        vm.startPrank(alice);
        vault.stake(100 * ONE_USDC);
        vault.withdraw(40 * ONE_USDC);
        vm.stopPrank();

        assertEq(vault.balanceOf(alice), 60 * ONE_USDC);
        assertEq(vault.totalStaked(), 60 * ONE_USDC);
        assertEq(usdc.balanceOf(alice), 940 * ONE_USDC);
    }

    function test_Withdraw_MoreThanStaked_Reverts() public {
        vm.startPrank(alice);
        vault.stake(10 * ONE_USDC);
        vm.expectRevert(StakingVault.InsufficientStake.selector);
        vault.withdraw(11 * ONE_USDC);
        vm.stopPrank();
    }

    function test_Withdraw_ZeroAmount_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(StakingVault.ZeroAmount.selector);
        vault.withdraw(0);
    }

    // ─── Reward accrual (6-decimal precision)
    // ─────────────────────────────────

    function test_Rewards_SingleStaker_FullPeriod_NoTruncation() public {
        // rewardRate = 604800 / 604800 = 1 USDC-unit per second.
        uint256 reward = DURATION * 1; // 604800 smallest units
        vm.prank(alice);
        vault.stake(ONE_USDC);
        _fundRewards(reward);

        vm.warp(vm.getBlockTimestamp() + DURATION);

        // Single staker earns the entire pool with no rounding dust.
        assertEq(vault.earned(alice), reward);
    }

    function test_Rewards_SplitProportionally() public {
        uint256 reward = DURATION * 2; // rate = 2 units/sec
        vm.prank(alice);
        vault.stake(ONE_USDC);
        vm.prank(bob);
        vault.stake(ONE_USDC);
        _fundRewards(reward);

        vm.warp(vm.getBlockTimestamp() + DURATION);

        // Equal stake → equal split, and together they account for the whole pool.
        assertEq(vault.earned(alice), reward / 2);
        assertEq(vault.earned(bob), reward / 2);
    }

    function test_GetReward_TransfersAndZeroes() public {
        uint256 reward = DURATION * 1;
        vm.prank(alice);
        vault.stake(ONE_USDC);
        _fundRewards(reward);
        vm.warp(vm.getBlockTimestamp() + DURATION);

        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        vault.getReward();

        assertEq(usdc.balanceOf(alice), before + reward);
        assertEq(vault.earned(alice), 0);
        assertEq(vault.rewards(alice), 0);
    }

    function test_Exit_WithdrawsAndClaims() public {
        uint256 reward = DURATION * 1;
        vm.prank(alice);
        vault.stake(50 * ONE_USDC);
        _fundRewards(reward);
        vm.warp(vm.getBlockTimestamp() + DURATION);

        vm.prank(alice);
        vault.exit();

        assertEq(vault.balanceOf(alice), 0);
        // Original 1000 USDC back + reward.
        assertEq(usdc.balanceOf(alice), 1000 * ONE_USDC + reward);
    }

    function test_RewardPerToken_ZeroWhenNoStake() public {
        _fundRewards(DURATION * 1);
        vm.warp(vm.getBlockTimestamp() + 1 days);
        // No stake means the accumulator never advances.
        assertEq(vault.rewardPerToken(), 0);
    }

    // ─── Reward schedule administration
    // ──────────────────────────────────────

    function test_NotifyRewardAmount_RewardTooHigh_Reverts() public {
        // Vault holds nothing, so any non-zero rate is unfundable.
        vm.prank(owner);
        vm.expectRevert(StakingVault.RewardTooHigh.selector);
        vault.notifyRewardAmount(DURATION * 1);
    }

    function test_NotifyRewardAmount_OnlyOwner() public {
        usdc.mint(address(vault), DURATION);
        vm.prank(stranger);
        vm.expectRevert();
        vault.notifyRewardAmount(DURATION);
    }

    function test_NotifyRewardAmount_ExcludesStakedPrincipal() public {
        // Alice stakes; that principal must not be spendable as rewards even though stake
        // and reward token are identical. Funding only the staked amount (no real reward)
        // must therefore revert.
        vm.prank(alice);
        vault.stake(100 * ONE_USDC);
        vm.prank(owner);
        vm.expectRevert(StakingVault.RewardTooHigh.selector);
        vault.notifyRewardAmount(DURATION); // no reward tokens funded beyond principal
    }

    function test_SetRewardsDuration_DuringPeriod_Reverts() public {
        _fundRewards(DURATION * 1);
        vm.prank(owner);
        vm.expectRevert(StakingVault.InvalidRewardsDuration.selector);
        vault.setRewardsDuration(14 days);
    }

    function test_SetRewardsDuration_AfterPeriod_Succeeds() public {
        _fundRewards(DURATION * 1);
        vm.warp(vm.getBlockTimestamp() + DURATION + 1);
        vm.prank(owner);
        vault.setRewardsDuration(14 days);
        assertEq(vault.rewardsDuration(), 14 days);
    }

    function test_SetRewardsDuration_TooLong_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(StakingVault.InvalidRewardsDuration.selector);
        vault.setRewardsDuration(366 days);
    }

    // ─── Pausing
    // ──────────────────────────────────────────────────────────────

    function test_Pause_BlocksStake_AllowsWithdraw() public {
        vm.prank(alice);
        vault.stake(10 * ONE_USDC);

        vm.prank(owner);
        vault.pause();

        vm.prank(alice);
        vm.expectRevert(); // Pausable: EnforcedPause
        vault.stake(ONE_USDC);

        // Withdrawals remain available while paused.
        vm.prank(alice);
        vault.withdraw(10 * ONE_USDC);
        assertEq(vault.balanceOf(alice), 0);
    }

    // ─── ERC-20 recovery
    // ──────────────────────────────────────────────────────

    function test_RecoverERC20_StakingToken_Reverts() public {
        vm.prank(owner);
        vm.expectRevert(StakingVault.CannotRecoverStakingToken.selector);
        vault.recoverERC20(address(usdc), 1);
    }

    function test_RecoverERC20_OtherToken_Succeeds() public {
        MockUSDC other = new MockUSDC();
        other.mint(address(vault), 500 * ONE_USDC);
        vm.prank(owner);
        vault.recoverERC20(address(other), 500 * ONE_USDC);
        assertEq(other.balanceOf(owner), 500 * ONE_USDC);
    }
}
