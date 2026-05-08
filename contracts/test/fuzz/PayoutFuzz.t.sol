// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-strict-inequalities
// solhint-disable gas-small-strings
// solhint-disable function-max-lines
// solhint-disable ordering

// Fuzzing is a testing technique where the test framework automatically generates
// thousands of random inputs and checks that invariants (properties that must ALWAYS hold)
// are never violated. Foundry's fuzzer runs each `testFuzz_*` function with many
// different values (default 256 runs; we use 10,000 in foundry.toml for more coverage).
//
// This file tests mathematical invariants of the payout system:
//   - Total payouts never exceed the escrowed amount minus the fee pool.
//   - The partial payout formula matches its expected mathematical form.
//   - Deadlines are always in the future.
//   - Hold-back amounts stay within their declared percentage bounds.

import {Test} from "forge-std/Test.sol";
import {TrustLedger} from "../../src/TrustLedger.sol";
import {Arbitration} from "../../src/Arbitration.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";

contract PayoutFuzz is Test {

    bytes32 public constant CONTRACT_HASH = keccak256("contract");
    bytes32 public constant POW_HASH      = keccak256("pow");

    TrustLedger  public trustLedger;
    Arbitration  public arbitration;
    JurorRegistry public jurorRegistry;

    address public client    = makeAddr("client");
    address public freelancer = makeAddr("freelancer");

    // setUp() runs before every fuzz test — it deploys fresh contracts.
    function setUp() public {
        // Give the client enough ETH for even the largest fuzz inputs.
        // type(uint128).max ≈ 3.4 × 10^38 wei. Uint128 is used as the fuzz input
        // type because uint256 amounts could overflow intermediate calculations.
        vm.deal(client,    type(uint128).max);
        vm.deal(freelancer, 10 ether);

        // Same precomputed address pattern as the unit tests.
        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = computeCreateAddress(address(this), nonce + 2);

        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger   = new TrustLedger(arbitrationAddr);
        arbitration   = new Arbitration(address(trustLedger), address(jurorRegistry));
    }

    // ─── Payout conservation invariant ───────────────────────────────────────
    // INVARIANT: for any valid (completionPct, amount, arbitrationFeeBps),
    //   freelancerPay + clientRefund == amount - feePool
    // This means no ETH is lost or created by the ruling — it's a zero-sum split.
    function testFuzz_PayoutConservation(
        uint8  completionPct,    // Foundry generates random uint8 values (0-255)
        uint128 amount,          // uint128 keeps intermediate math within uint256 range
        uint16 arbitrationFeeBps
    ) public {
        // `vm.assume(condition)` tells the fuzzer to skip this run if the condition
        // is false. This narrows the input space to valid contract parameters.
        vm.assume(completionPct <= 100);
        vm.assume(amount > 0);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000); // 0.01% to 50%

        // Run the full lifecycle: create → accept → submit → dispute → ruling.
        vm.prank(client);
        uint256 id = trustLedger.createContract{value: amount}(
            freelancer,
            CONTRACT_HASH,
            "ipfs://contract",
            30 days,
            1200,   // 1.2× buffer factor
            48 hours,
            arbitrationFeeBps,
            0, 0    // no hold-back
        );

        vm.prank(freelancer);
        trustLedger.acceptContract(id);

        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore     = client.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);

        // Simulate Arbitration calling back with the fuzz-generated ruling.
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, completionPct);

        uint256 freelancerGot = freelancer.balance - freelancerBefore;
        uint256 clientGot     = client.balance - clientBefore;

        // Compute what "remaining" should be after deducting the fee pool.
        uint256 feePool   = (uint256(amount) * arbitrationFeeBps) / 10_000;
        uint256 remaining = uint256(amount) - feePool;

        // Core invariant: all remaining ETH is distributed; none disappears.
        assertEq(
            freelancerGot + clientGot,
            remaining,
            "payout conservation violated"
        );

        // Sanity bounds: neither party can receive more than the total remaining.
        assertLe(freelancerGot, remaining, "freelancer overpaid");
        assertLe(clientGot,     remaining, "client overpaid");
    }

    // ─── Partial payout formula ───────────────────────────────────────────────
    // INVARIANT: for completionPct in 1-99, the formula
    //   freelancerPay = (2 * pct * amount) / 300
    // always holds (capped at `remaining`).
    // This test verifies the contract's math matches the spec exactly.
    function testFuzz_PartialPayoutFormula(
        uint8  completionPct,
        uint128 amount,
        uint16 arbitrationFeeBps
    ) public {
        vm.assume(completionPct >= 1 && completionPct <= 99); // only partial payouts
        vm.assume(amount > 300);  // amounts < 300 can give 0 due to integer truncation
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: amount}(
            freelancer, CONTRACT_HASH, "ipfs://contract",
            30 days, 1200, 48 hours, arbitrationFeeBps, 0, 0
        );

        vm.prank(freelancer);
        trustLedger.acceptContract(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");

        uint256 freelancerBefore = freelancer.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, completionPct);

        uint256 freelancerGot = freelancer.balance - freelancerBefore;

        // Recompute what we expect the contract to have calculated.
        uint256 feePool   = (uint256(amount) * arbitrationFeeBps) / 10_000;
        uint256 remaining = uint256(amount) - feePool;
        uint256 expected  = (2 * uint256(completionPct) * uint256(amount)) / 300;
        if (expected > remaining) expected = remaining; // cap at remaining

        assertEq(freelancerGot, expected, "partial payout formula mismatch");
    }

    // ─── Buffer factor deadline invariant ────────────────────────────────────
    // INVARIANT: for any (estimatedDuration, bufferFactor) in valid ranges,
    //   projectDeadline > block.timestamp AND
    //   projectDeadline == block.timestamp + (estimatedDuration × bufferFactor) / 1000
    function testFuzz_BufferFactorDeadline(
        uint32 estimatedDuration, // uint32 = max ~136 years in seconds (reasonable)
        uint32 bufferFactor
    ) public {
        vm.assume(estimatedDuration > 0 && estimatedDuration <= 365 days);
        vm.assume(bufferFactor >= 1100 && bufferFactor <= 10_000); // 1.1× to 10×

        uint256 ts = block.timestamp; // capture timestamp before the transaction

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: 1 ether}(
            freelancer, CONTRACT_HASH, "ipfs://contract",
            estimatedDuration, bufferFactor,
            48 hours, 100, 0, 0 // 1% fee, no hold-back
        );

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        // Deadline must be in the future.
        assertGt(c.projectDeadline, ts, "projectDeadline must be in the future");

        // Deadline must match the exact formula.
        uint256 expectedDeadline = ts + (uint256(estimatedDuration) * bufferFactor) / 1000;
        assertEq(c.projectDeadline, expectedDeadline, "deadline formula mismatch");
    }

    // ─── Hold-back invariant ──────────────────────────────────────────────────
    // INVARIANT: for any holdBackBps in [500, 1500],
    //   holdBackAmount is always between 5% and 15% of the original amount.
    function testFuzz_HoldBackBounds(
        uint128 amount,
        uint16  holdBackBpsRaw // raw unconstrained uint16 from fuzzer
    ) public {
        vm.assume(amount > 0);

        // Map the arbitrary uint16 into the valid [500, 1500] range using modulo.
        // Using `%` avoids relying on vm.assume() for a narrow range (which would
        // cause many rejected runs and slow down the fuzzer).
        uint16 holdBackBps = uint16(500 + (uint256(holdBackBpsRaw) % 1001));

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: amount}(
            freelancer, CONTRACT_HASH, "ipfs://contract",
            30 days, 1200, 48 hours,
            100, holdBackBps, 7 days // 1% fee, variable holdback, 7d warranty
        );

        vm.prank(freelancer);
        trustLedger.acceptContract(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");
        vm.prank(client);
        trustLedger.approveWork(id); // triggers _releaseToFreelancer which sets holdBackAmount

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        // Compute the expected bounds from first principles.
        uint256 maxHoldBack = (uint256(amount) * 1500) / 10_000; // 15%
        uint256 minHoldBack = (uint256(amount) * 500)  / 10_000; // 5%

        assertLe(c.holdBackAmount, maxHoldBack, "hold-back exceeds 15%");
        assertGe(c.holdBackAmount, minHoldBack, "hold-back below 5%");
    }

    // ─── Fee pool bounds invariant ────────────────────────────────────────────
    // INVARIANT: for any (amount, arbitrationFeeBps) in valid ranges,
    //   feePool <= amount (the fee never exceeds the escrow).
    // This is a pure arithmetic test — no state changes needed, hence `pure`.
    function testFuzz_FeePoolBounds(
        uint128 amount,
        uint16  arbitrationFeeBps
    ) public pure {
        vm.assume(amount > 10_000); // avoid precision issues where fee rounds to 0
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        uint256 feePool    = (uint256(amount) * arbitrationFeeBps) / 10_000;
        uint256 maxFeePool = (uint256(amount) * 5000) / 10_000; // 50% — the maximum
        uint256 minFeePool = 0; // can legitimately be 0 for very small amounts with low bps

        assertLe(feePool, maxFeePool, "fee pool exceeds 50%");
        assertGe(feePool, minFeePool, "fee pool underflow (impossible but explicit)");

        // The fee pool can never exceed the full escrow amount.
        assertGe(uint256(amount), feePool, "fee pool exceeds amount");
    }

    // ─── Zero / full payout edge cases ───────────────────────────────────────
    // These test the boundary conditions (completionPct = 0 and 100) across
    // all possible amounts and fee configurations.

    // At 0% completion, the freelancer should get nothing regardless of amount or fee.
    function testFuzz_ZeroPct_FreelancerGetsNothing(
        uint128 amount,
        uint16  arbitrationFeeBps
    ) public {
        vm.assume(amount > 0);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: amount}(
            freelancer, CONTRACT_HASH, "ipfs://contract",
            30 days, 1200, 48 hours, arbitrationFeeBps, 0, 0
        );

        vm.prank(freelancer);
        trustLedger.acceptContract(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");

        uint256 freelancerBefore = freelancer.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 0); // 0% → freelancer gets nothing

        assertEq(freelancer.balance, freelancerBefore, "freelancer should get nothing at 0%");
    }

    // At 100% completion, the client should get nothing (freelancer wins all remaining).
    function testFuzz_FullPct_ClientGetsNothing(
        uint128 amount,
        uint16  arbitrationFeeBps
    ) public {
        vm.assume(amount > 0);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: amount}(
            freelancer, CONTRACT_HASH, "ipfs://contract",
            30 days, 1200, 48 hours, arbitrationFeeBps, 0, 0
        );

        vm.prank(freelancer);
        trustLedger.acceptContract(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");

        vm.prank(client);
        trustLedger.disputeWork(id);

        // Capture client balance AFTER the disputeWork call (which costs gas).
        // We want to verify the client gets nothing FROM the ruling, not from gas refunds.
        uint256 clientAfterDispute = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 100); // 100% → client gets nothing

        assertEq(client.balance, clientAfterDispute, "client should get nothing at 100%");
    }
}
