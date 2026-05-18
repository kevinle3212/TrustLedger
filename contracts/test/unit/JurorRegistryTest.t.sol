// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-small-strings
// solhint-disable gas-struct-packing
// solhint-disable ordering

// `Test` is Foundry's base test contract. It provides:
//   - vm: a "cheat code" interface to manipulate the EVM state during tests
//   - assert* functions: assertEq, assertTrue, assertFalse, assertGt, assertLe, etc.
//   - makeAddr(), computeCreateAddress(), and other test utilities
// Foundry automatically detects any function whose name starts with `test_` and runs it.
import {Test} from "forge-std/Test.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";

// The test contract inherits from Test to gain access to all the cheat codes and assertions.
contract JurorRegistryTest is Test {
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant LOCK_PERIOD = 7 days;
    uint256 public constant COOLDOWN_PERIOD = 7 days; // mirrors JurorRegistry.JUROR_COOLDOWN
    uint256 public constant MIN_REPUTATION = 20; // mirrors JurorRegistry.MIN_REPUTATION

    JurorRegistry public registry;

    // makeAddr("label") deterministically generates a unique fake address from a label string.
    // It's reproducible across runs (same label always gives the same address) but the
    // address has no private key, so it can't sign transactions — we use vm.prank() instead.
    address public arbSim = makeAddr("arbitration"); // simulates the Arbitration contract
    address public juror1 = makeAddr("juror1");
    address public juror2 = makeAddr("juror2");
    address public stranger = makeAddr("stranger"); // unauthorized caller for revert tests

    // setUp() runs before every single test function. Foundry takes a snapshot of the
    // EVM state after setUp() and resets to it before each test, giving every test
    // a clean starting state. This is equivalent to `beforeEach` in Hardhat/Mocha.
    function setUp() public {
        // Deploy a fresh JurorRegistry. We pass arbSim as the "arbitration" address
        // so that tests can simulate Arbitration calling lockForDispute / slash by
        // using vm.prank(arbSim).
        registry = new JurorRegistry(arbSim);

        // vm.deal(address, amount) sets an account's ETH balance to `amount`.
        // This gives our test addresses ETH to send with payable calls.
        vm.deal(juror1, 10 ether);
        vm.deal(juror2, 10 ether);
        vm.deal(stranger, 1 ether);
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    function test_Register_SufficientStake() public {
        // vm.prank(addr) makes the very next call appear to come from `addr`.
        // After that one call, msg.sender reverts to the test contract's address.
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}(); // `{value: x}` sends ETH with the call

        // Read back the stored data and verify every field.
        IJurorInfo memory j = _getJuror(juror1);
        assertTrue(j.active, "should be active");
        assertEq(j.stake, MIN_STAKE, "stake mismatch");
        assertEq(j.reputation, 100, "reputation should start at 100");
        assertEq(j.disputesParticipated, 0);
        assertEq(j.minorityVotes, 0);
        assertEq(j.activeDisputes, 0);
    }

    function test_Register_BelowMinimum_Reverts() public {
        // vm.expectRevert(selector) tells Foundry: "the next call MUST revert with this error".
        // If the call doesn't revert, or reverts with a different error, the test fails.
        // `.selector` extracts the 4-byte function selector from the error type.
        vm.expectRevert(JurorRegistry.StakeBelowMinimum.selector);
        vm.prank(juror1);
        registry.register{value: MIN_STAKE - 1}(); // 1 wei below minimum → should revert
    }

    function test_Register_AlreadyRegistered_Reverts() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Second registration by same address should fail
        vm.expectRevert(JurorRegistry.AlreadyRegistered.selector);
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
    }

    function test_Register_AddsToJurorList() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
        vm.prank(juror2);
        registry.register{value: MIN_STAKE}();

        address[] memory list = registry.getJurorList();
        assertEq(list.length, 2); // both jurors added
        assertEq(list[0], juror1);
        assertEq(list[1], juror2);
    }

    // ─── Stake Lock ───────────────────────────────────────────────────────────

    function test_Unstake_LockedReverts() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Immediately after registering, the lock period hasn't elapsed yet.
        vm.expectRevert(JurorRegistry.StakeLocked.selector);
        vm.prank(juror1);
        registry.unstake(MIN_STAKE);
    }

    function test_Unstake_AfterLockPeriod() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // vm.warp(timestamp) fast-forwards block.timestamp to the given value.
        // This lets us test time-dependent logic without waiting real time.
        vm.warp(block.timestamp + LOCK_PERIOD + 1);

        uint256 before = juror1.balance;
        vm.prank(juror1);
        registry.unstake(MIN_STAKE);

        // Verify the ETH was returned to the juror's balance.
        assertEq(juror1.balance, before + MIN_STAKE, "unstake amount mismatch");
    }

    function test_Unstake_DeactivatesIfBelowMin() public {
        uint256 bigStake = 0.1 ether;
        vm.prank(juror1);
        registry.register{value: bigStake}(); // register with 10× minimum

        vm.warp(block.timestamp + LOCK_PERIOD + 1);

        // Withdraw enough to drop below MIN_STAKE. The contract should deactivate the juror.
        uint256 toWithdraw = bigStake - MIN_STAKE + 1; // 1 wei over the threshold
        vm.prank(juror1);
        registry.unstake(toWithdraw);

        IJurorInfo memory j = _getJuror(juror1);
        assertFalse(j.active, "should be deactivated below min stake");
    }

    function test_Unstake_HasActiveDisputes_Reverts() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Simulate Arbitration locking the juror into a dispute.
        // vm.prank(arbSim) makes the call appear to come from the arbSim address,
        // which passes the `onlyArbitration` modifier check.
        vm.prank(arbSim);
        registry.lockForDispute(juror1);

        vm.warp(block.timestamp + LOCK_PERIOD + 1);

        // Even after the lock period, unstaking is blocked while in an active dispute.
        vm.expectRevert(JurorRegistry.HasActiveDisputes.selector);
        vm.prank(juror1);
        registry.unstake(MIN_STAKE);
    }

    // ─── Add Stake ────────────────────────────────────────────────────────────

    function test_AddStake_ResetsLockPeriod() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Fast-forward past the initial lock period → juror becomes eligible.
        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertTrue(registry.isEligible(juror1));

        // Adding stake resets the lock clock.
        vm.prank(juror1);
        registry.addStake{value: 0.01 ether}();

        // Juror is no longer eligible because the lock period restarted.
        assertFalse(registry.isEligible(juror1), "should be locked again after addStake");

        IJurorInfo memory j = _getJuror(juror1);
        assertEq(j.stake, 2 * MIN_STAKE, "stake total mismatch");
    }

    // ─── Eligibility ─────────────────────────────────────────────────────────

    function test_Eligibility_InitiallyFalse() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Right after registering, the stake lock hasn't elapsed → not eligible.
        assertFalse(registry.isEligible(juror1), "should not be eligible right after register");
    }

    function test_Eligibility_TrueAfterLock() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Exactly at the lock expiry → now eligible.
        vm.warp(block.timestamp + LOCK_PERIOD);
        assertTrue(registry.isEligible(juror1), "should be eligible after lock period");
    }

    function test_Eligibility_FalseIfInactive() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertTrue(registry.isEligible(juror1));

        // Unstake everything → stake drops to 0 → deactivated → not eligible.
        vm.prank(juror1);
        registry.unstake(MIN_STAKE);

        assertFalse(registry.isEligible(juror1));
    }

    // ─── Slash ────────────────────────────────────────────────────────────────

    function test_Slash_ReducesStakeAndMinorityVotes() public {
        vm.prank(juror1);
        registry.register{value: 1 ether}(); // register with 100× minimum stake

        uint256 slashAmt = 0.1 ether; // slash 10% of 1 ether

        // Simulate Arbitration calling slash (only arbSim passes the onlyArbitration check).
        vm.prank(arbSim);
        registry.slash(juror1, slashAmt);

        IJurorInfo memory j = _getJuror(juror1);
        assertEq(j.stake, 1 ether - slashAmt, "stake after slash mismatch");
        assertEq(j.minorityVotes, 1, "minority vote count mismatch");
        assertEq(j.reputation, 90, "reputation should decrease by 10");
    }

    function test_Slash_DeactivatesIfBelowMin() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}(); // exactly at the minimum

        vm.prank(arbSim);
        registry.slash(juror1, 1); // slash just 1 wei → drops below minimum → deactivate

        IJurorInfo memory j = _getJuror(juror1);
        assertFalse(j.active, "should be deactivated after slash below minimum");
    }

    function test_Slash_OnlyArbitration_Reverts() public {
        vm.prank(juror1);
        registry.register{value: 1 ether}();

        // A random stranger cannot call slash — must come from arbSim (the Arbitration address).
        vm.expectRevert(JurorRegistry.OnlyArbitration.selector);
        vm.prank(stranger);
        registry.slash(juror1, 0.1 ether);
    }

    // ─── Lock / Unlock for Dispute ────────────────────────────────────────────

    function test_LockForDispute_IncreasesActiveDisputes() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        vm.prank(arbSim);
        registry.lockForDispute(juror1);

        IJurorInfo memory j = _getJuror(juror1);
        assertEq(j.activeDisputes, 1); // counter incremented
    }

    function test_UnlockFromDispute_DecreasesAndIncrementsParticipated() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        vm.prank(arbSim);
        registry.lockForDispute(juror1);

        vm.prank(arbSim);
        registry.unlockFromDispute(juror1);

        IJurorInfo memory j = _getJuror(juror1);
        assertEq(j.activeDisputes, 0); // lock released
        assertEq(j.disputesParticipated, 1); // participation recorded
    }

    function test_LockUnlock_OnlyArbitration_Reverts() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        // Both lock and unlock are gated by onlyArbitration.
        vm.expectRevert(JurorRegistry.OnlyArbitration.selector);
        vm.prank(stranger);
        registry.lockForDispute(juror1);

        vm.expectRevert(JurorRegistry.OnlyArbitration.selector);
        vm.prank(stranger);
        registry.unlockFromDispute(juror1);
    }

    // ─── EligibleJurorCount ───────────────────────────────────────────────────

    function test_EligibleJurorCount() public {
        assertEq(registry.eligibleJurorCount(), 0); // no jurors yet

        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
        vm.prank(juror2);
        registry.register{value: MIN_STAKE}();

        assertEq(registry.eligibleJurorCount(), 0); // both still in lock period

        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertEq(registry.eligibleJurorCount(), 2); // both eligible after lock expires
    }

    // ─── Post-dispute cooldown ────────────────────────────────────────────────

    function test_GetCooldownUntil_ZeroForNewJuror() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
        assertEq(registry.getCooldownUntil(juror1), 0, "new juror cooldown should be 0");
    }

    function test_UnlockFromDispute_SetsCooldown() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();

        vm.prank(arbSim);
        registry.lockForDispute(juror1);

        uint64 unlockTs = uint64(block.timestamp);
        vm.prank(arbSim);
        registry.unlockFromDispute(juror1);

        assertEq(
            registry.getCooldownUntil(juror1),
            unlockTs + uint64(COOLDOWN_PERIOD),
            "cooldown should be set to unlock time + JUROR_COOLDOWN"
        );
    }

    function test_Eligibility_FalseWhileInCooldown() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertTrue(registry.isEligible(juror1), "should be eligible before any dispute");

        vm.prank(arbSim);
        registry.lockForDispute(juror1);
        vm.prank(arbSim);
        registry.unlockFromDispute(juror1);

        assertFalse(registry.isEligible(juror1), "should not be eligible during cooldown");
    }

    function test_Eligibility_TrueAfterCooldownExpires() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
        vm.warp(block.timestamp + LOCK_PERIOD + 1);

        vm.prank(arbSim);
        registry.lockForDispute(juror1);
        vm.prank(arbSim);
        registry.unlockFromDispute(juror1);

        // Warp to the exact cooldown expiry stored in the contract — avoids any
        // IR-optimizer constant-folding issue with block.timestamp + COOLDOWN_PERIOD.
        vm.warp(uint256(registry.getCooldownUntil(juror1)));
        assertTrue(registry.isEligible(juror1), "should be eligible after cooldown expires");
    }

    function test_EligibleJurorCount_ExcludesCooldown() public {
        vm.prank(juror1);
        registry.register{value: MIN_STAKE}();
        vm.prank(juror2);
        registry.register{value: MIN_STAKE}();
        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertEq(registry.eligibleJurorCount(), 2);

        // Put juror1 in cooldown.
        vm.prank(arbSim);
        registry.lockForDispute(juror1);
        vm.prank(arbSim);
        registry.unlockFromDispute(juror1);

        assertEq(registry.eligibleJurorCount(), 1, "only juror2 should be eligible");
    }

    // ─── Reputation minimum ───────────────────────────────────────────────────

    function test_Eligibility_FalseIfBelowMinReputation() public {
        vm.prank(juror1);
        registry.register{value: 1 ether}(); // 100× minimum so slashing won't deactivate
        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertTrue(registry.isEligible(juror1));

        // Slash 9 times with amount=0: reputation decays 10 per slash (100 → 10) without
        // touching stake, so the juror stays active but falls below MIN_REPUTATION = 20.
        for (uint256 i = 0; i < 9; ++i) {
            vm.prank(arbSim);
            registry.slash(juror1, 0);
        }

        IJurorInfo memory j = _getJuror(juror1);
        assertLt(j.reputation, MIN_REPUTATION, "reputation should be below minimum after 9 slashes");
        assertFalse(registry.isEligible(juror1), "should not be eligible below MIN_REPUTATION");
    }

    function test_EligibleJurorCount_ExcludesLowReputation() public {
        vm.prank(juror1);
        registry.register{value: 1 ether}();
        vm.prank(juror2);
        registry.register{value: MIN_STAKE}();
        vm.warp(block.timestamp + LOCK_PERIOD + 1);
        assertEq(registry.eligibleJurorCount(), 2);

        // Slash juror1's reputation below the minimum.
        for (uint256 i = 0; i < 9; ++i) {
            vm.prank(arbSim);
            registry.slash(juror1, 0);
        }

        assertEq(registry.eligibleJurorCount(), 1, "only juror2 should be eligible");
    }

    // ─── Not Registered ───────────────────────────────────────────────────────

    function test_Unstake_NotRegistered_Reverts() public {
        vm.expectRevert(JurorRegistry.NotRegistered.selector);
        vm.prank(stranger);
        registry.unstake(0.01 ether); // stranger never registered
    }

    function test_AddStake_NotRegistered_Reverts() public {
        vm.expectRevert(JurorRegistry.NotRegistered.selector);
        vm.prank(stranger);
        registry.addStake{value: 0.01 ether}();
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    function test_Constructor_ZeroAddress_Reverts() public {
        // `new Contract(args)` inside a test deploys a fresh instance.
        // This tests that the constructor rejects address(0) as the arbitration address.
        vm.expectRevert(JurorRegistry.ZeroAddress.selector);
        new JurorRegistry(address(0));
    }

    // ─── Internal helper ──────────────────────────────────────────────────────
    // The JurorInfo struct lives in IJurorRegistry. We define a local mirror struct
    // here because Solidity can't easily unpack a struct returned from an interface
    // into individual fields in a single call. This wrapper just copies all fields.
    struct IJurorInfo {
        address addr;
        uint256 stake;
        uint256 stakeUnlockTime;
        uint256 reputation;
        uint256 disputesParticipated;
        uint256 minorityVotes;
        bool active;
        uint256 activeDisputes;
    }

    function _getJuror(address juror) internal view returns (IJurorInfo memory) {
        JurorRegistry.JurorInfo memory j = registry.getJuror(juror);
        // Manually copy each field — Solidity can't implicitly convert between two
        // structs with identical fields defined in different scopes.
        return IJurorInfo({
            addr: j.addr,
            stake: j.stake,
            stakeUnlockTime: j.stakeUnlockTime,
            reputation: j.reputation,
            disputesParticipated: j.disputesParticipated,
            minorityVotes: j.minorityVotes,
            active: j.active,
            activeDisputes: j.activeDisputes
        });
    }
}
