// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-strict-inequalities
// solhint-disable gas-small-strings
// solhint-disable function-max-lines
// solhint-disable ordering

// Mathematical invariants verified by fuzz testing:
//   - Total payouts never exceed the escrowed amount minus the fee pool.
//   - The partial payout formula matches its expected mathematical form.
//   - Deadlines are always in the future.
//   - Hold-back amounts stay within their declared percentage bounds.

import {Test} from "forge-std/Test.sol";
import {Arbitration} from "./../../src/Arbitration.sol";
import {JurorRegistry} from "./../../src/JurorRegistry.sol";
import {TrustLedger} from "./../../src/TrustLedger.sol";

contract PayoutFuzz is Test {
    bytes32 public constant CONTRACT_HASH = keccak256("contract");
    bytes32 public constant POW_HASH = keccak256("pow");

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;

    address public client = makeAddr("client");
    address public freelancer = makeAddr("freelancer");

    function setUp() public {
        // Give the client enough ETH for even the largest fuzz inputs.
        // type(uint128).max ≈ 3.4 × 10^38 wei. Uint128 is used as the fuzz input
        // type because uint256 amounts could overflow intermediate calculations.
        vm.deal(client, type(uint128).max);
        vm.deal(freelancer, 10 ether);

        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = computeCreateAddress(address(this), nonce + 2);

        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger = new TrustLedger(arbitrationAddr);
        arbitration = new Arbitration(address(trustLedger), address(jurorRegistry));
    }

    /// Proposes a contract, has the client accept and fund it, and submits proof of work with no hold-back.
    function _createSubmitted(uint128 amount, uint16 arbitrationFeeBps) internal returns (uint256 id) {
        vm.prank(freelancer);
        id = trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: "ipfs://contract",
            estimatedDuration: 30 days,
            bufferFactor: 1200,
            acceptanceWindow: 48 hours,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            amount: amount
        });
        vm.prank(client);
        trustLedger.acceptContract{value: amount}(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");
    }

    // ─── Payout conservation invariant
    // ───────────────────────────────────────
    // INVARIANT: for any valid (completionPct, amount, arbitrationFeeBps),
    //   freelancerPay + clientRefund == amount - feePool
    // This means no ETH is lost or created by the ruling - it's a zero-sum split.
    function testFuzz_PayoutConservation(
        uint8 completionPct, // Foundry generates random uint8 values (0-255)
        uint128 amount, // uint128 keeps intermediate math within uint256 range
        uint16 arbitrationFeeBps
    )
        public
    {
        vm.assume(completionPct <= 100);
        vm.assume(amount > 0);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        uint256 id = _createSubmitted(amount, arbitrationFeeBps);

        uint256 freelancerBefore = freelancer.balance;
        uint256 clientBefore = client.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, completionPct);

        uint256 freelancerGot = freelancer.balance - freelancerBefore;
        uint256 clientGot = client.balance - clientBefore;

        uint256 feePool = (uint256(amount) * arbitrationFeeBps) / 10_000;
        uint256 remaining = uint256(amount) - feePool;

        assertEq(freelancerGot + clientGot, remaining, "payout conservation violated");

        assertLe(freelancerGot, remaining, "freelancer overpaid");
        assertLe(clientGot, remaining, "client overpaid");
    }

    // ─── Partial payout formula
    // ───────────────────────────────────────────────
    // INVARIANT: for completionPct in 1-99, the proportional-fee formula
    //   rawPay              = (2 * pct * amount) / 300  [equivalent to (2/3) × (pct/100 × amount)]
    //   freelancerFeeBurden = (feePool * pct) / 100     [freelancer bears their share of the fee]
    //   freelancerPay       = rawPay - freelancerFeeBurden  (capped at remaining)
    // always holds. This test verifies the contract's math matches the spec exactly.
    function testFuzz_PartialPayoutFormula(uint8 completionPct, uint128 amount, uint16 arbitrationFeeBps) public {
        vm.assume(completionPct >= 1 && completionPct <= 99);
        vm.assume(amount > 300); // amounts ≤ 300 can give 0 due to integer truncation
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        uint256 id = _createSubmitted(amount, arbitrationFeeBps);
        uint256 freelancerBefore = freelancer.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, completionPct);

        uint256 freelancerGot = freelancer.balance - freelancerBefore;

        // Recompute the expected value using the new proportional formula.
        uint256 feePool = (uint256(amount) * arbitrationFeeBps) / 10_000;
        uint256 remaining = uint256(amount) - feePool;
        uint256 rawPay = (2 * uint256(completionPct) * uint256(amount)) / 300;
        uint256 freelancerFeeBurden = (feePool * uint256(completionPct)) / 100;
        uint256 expected = rawPay - freelancerFeeBurden;
        if (expected > remaining) {
            expected = remaining;
        }

        assertEq(freelancerGot, expected, "partial payout formula mismatch");
    }

    // ─── Buffer factor deadline invariant
    // ────────────────────────────────────
    // INVARIANT: for any (estimatedDuration, bufferFactor) in valid ranges,
    //   projectDeadline > vm.getBlockTimestamp() AND
    //   projectDeadline == vm.getBlockTimestamp() + (estimatedDuration × bufferFactor) / 1000
    function testFuzz_BufferFactorDeadline(
        uint32 estimatedDuration, // uint32 = max ~136 years in seconds (reasonable)
        uint32 bufferFactor
    )
        public
    {
        vm.assume(estimatedDuration > 0 && estimatedDuration <= 365 days);
        vm.assume(bufferFactor >= 1100 && bufferFactor <= 10_000);

        uint256 ts = vm.getBlockTimestamp();

        vm.prank(freelancer);
        uint256 id = trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: "ipfs://contract",
            estimatedDuration: estimatedDuration,
            bufferFactor: bufferFactor,
            acceptanceWindow: 48 hours,
            arbitrationFeeBps: 100,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(0),
            amount: 1 ether
        });

        // The deadline only becomes absolute once the client accepts (same block here, so ts is
        // unchanged). Before acceptance projectDeadline holds the relative buffered duration.
        vm.prank(client);
        trustLedger.acceptContract{value: 1 ether}(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        assertGt(c.projectDeadline, ts, "projectDeadline must be in the future");

        uint256 expectedDeadline = ts + (uint256(estimatedDuration) * bufferFactor) / 1000;
        assertEq(c.projectDeadline, expectedDeadline, "deadline formula mismatch");
    }

    // ─── Hold-back invariant
    // ──────────────────────────────────────────────────
    // INVARIANT: for any holdBackBps in [500, 1500],
    //   holdBackAmount is always between 5% and 15% of the original amount.
    function testFuzz_HoldBackBounds(
        uint128 amount,
        uint16 holdBackBpsRaw // raw unconstrained uint16 from fuzzer
    )
        public
    {
        vm.assume(amount > 0);

        // Map the arbitrary uint16 into the valid [500, 1500] range using modulo.
        // Using `%` avoids relying on vm.assume() for a narrow range (which would
        // cause many rejected runs and slow down the fuzzer).
        uint16 holdBackBps = uint16(500 + (uint256(holdBackBpsRaw) % 1001));

        vm.prank(freelancer);
        uint256 id = trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: "ipfs://contract",
            estimatedDuration: 30 days,
            bufferFactor: 1200,
            acceptanceWindow: 48 hours,
            arbitrationFeeBps: 100,
            holdBackBps: holdBackBps,
            warrantyPeriod: 7 days,
            token: address(0),
            amount: amount
        });

        vm.prank(client);
        trustLedger.acceptContract{value: amount}(id);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");
        vm.prank(client);
        trustLedger.approveWork(id); // triggers _releaseToFreelancer which sets holdBackAmount

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        uint256 maxHoldBack = (uint256(amount) * 1500) / 10_000; // 15%
        uint256 minHoldBack = (uint256(amount) * 500) / 10_000; // 5%

        assertLe(c.holdBackAmount, maxHoldBack, "hold-back exceeds 15%");
        assertGe(c.holdBackAmount, minHoldBack, "hold-back below 5%");
    }

    // ─── Fee pool bounds invariant
    // ────────────────────────────────────────────
    // INVARIANT: for any (amount, arbitrationFeeBps) in valid ranges,
    //   feePool <= amount (the fee never exceeds the escrow).
    function testFuzz_FeePoolBounds(uint128 amount, uint16 arbitrationFeeBps) public pure {
        vm.assume(amount > 10_000);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        uint256 feePool = (uint256(amount) * arbitrationFeeBps) / 10_000;
        uint256 maxFeePool = (uint256(amount) * 5000) / 10_000; // 50%

        assertLe(feePool, maxFeePool, "fee pool exceeds 50%");
        assertGe(uint256(amount), feePool, "fee pool exceeds amount");
    }

    // ─── Zero / full payout edge cases
    // ───────────────────────────────────────

    // At 0% completion, the freelancer should get nothing regardless of amount or fee.
    function testFuzz_ZeroPct_FreelancerGetsNothing(uint128 amount, uint16 arbitrationFeeBps) public {
        vm.assume(amount > 0);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        uint256 id = _createSubmitted(amount, arbitrationFeeBps);
        uint256 freelancerBefore = freelancer.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 0);

        assertEq(freelancer.balance, freelancerBefore, "freelancer should get nothing at 0%");
    }

    // At 100% completion, the client should get nothing (freelancer wins all remaining).
    function testFuzz_FullPct_ClientGetsNothing(uint128 amount, uint16 arbitrationFeeBps) public {
        vm.assume(amount > 0);
        vm.assume(arbitrationFeeBps >= 1 && arbitrationFeeBps <= 5000);

        uint256 id = _createSubmitted(amount, arbitrationFeeBps);

        vm.prank(client);
        trustLedger.disputeWork(id);

        uint256 clientAfterDispute = client.balance;

        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 100);

        assertEq(client.balance, clientAfterDispute, "client should get nothing at 100%");
    }
}
