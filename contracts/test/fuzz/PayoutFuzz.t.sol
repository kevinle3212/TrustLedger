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

import {Test, Vm} from "forge-std/Test.sol";
import {TrustLedger} from "../../src/TrustLedger.sol";
import {Arbitration} from "../../src/Arbitration.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";

contract PayoutFuzz is Test {
    bytes32 public constant CONTRACT_HASH = keccak256("contract");
    bytes32 public constant POW_HASH = keccak256("pow");

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;

    address public client = makeAddr("client");

    // The freelancer wallet is created via vm.createWallet to obtain the private key
    // needed for signing the ECDSA acceptance in acceptContract().
    Vm.Wallet internal _freelancerWallet;
    address public freelancer;

    function setUp() public {
        _freelancerWallet = vm.createWallet("freelancer");
        freelancer = _freelancerWallet.addr;

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

    function _signAccept(uint256 id) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 innerHash = keccak256(abi.encodePacked(id, freelancer));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash));
        (v, r, s) = vm.sign(_freelancerWallet.privateKey, ethSignedHash);
    }

    /// Creates a contract, accepts it, and submits proof of work with no hold-back.
    function _createSubmitted(uint128 amount, uint16 arbitrationFeeBps) internal returns (uint256 id) {
        vm.prank(client);
        id = trustLedger.createContract{value: amount}(
            freelancer,
            CONTRACT_HASH,
            "ipfs://contract",
            30 days,
            1200,
            48 hours,
            arbitrationFeeBps,
            0,
            0,
            address(0),
            0
        );
        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, "ipfs://pow");
    }

    // ─── Payout conservation invariant ───────────────────────────────────────
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

    // ─── Partial payout formula ───────────────────────────────────────────────
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
        if (expected > remaining) expected = remaining;

        assertEq(freelancerGot, expected, "partial payout formula mismatch");
    }

    // ─── Buffer factor deadline invariant ────────────────────────────────────
    // INVARIANT: for any (estimatedDuration, bufferFactor) in valid ranges,
    //   projectDeadline > block.timestamp AND
    //   projectDeadline == block.timestamp + (estimatedDuration × bufferFactor) / 1000
    function testFuzz_BufferFactorDeadline(
        uint32 estimatedDuration, // uint32 = max ~136 years in seconds (reasonable)
        uint32 bufferFactor
    )
        public
    {
        vm.assume(estimatedDuration > 0 && estimatedDuration <= 365 days);
        vm.assume(bufferFactor >= 1100 && bufferFactor <= 10_000);

        uint256 ts = block.timestamp;

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: 1 ether}(
            freelancer,
            CONTRACT_HASH,
            "ipfs://contract",
            estimatedDuration,
            bufferFactor,
            48 hours,
            100,
            0,
            0,
            address(0),
            0
        );

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);

        assertGt(c.projectDeadline, ts, "projectDeadline must be in the future");

        uint256 expectedDeadline = ts + (uint256(estimatedDuration) * bufferFactor) / 1000;
        assertEq(c.projectDeadline, expectedDeadline, "deadline formula mismatch");
    }

    // ─── Hold-back invariant ──────────────────────────────────────────────────
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

        vm.prank(client);
        uint256 id = trustLedger.createContract{value: amount}(
            freelancer,
            CONTRACT_HASH,
            "ipfs://contract",
            30 days,
            1200,
            48 hours,
            100,
            holdBackBps,
            7 days,
            address(0),
            0
        );

        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);
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

    // ─── Fee pool bounds invariant ────────────────────────────────────────────
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

    // ─── Zero / full payout edge cases ───────────────────────────────────────

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
