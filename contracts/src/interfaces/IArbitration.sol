// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// An interface is a contract with no implementation - only function signatures.
// It serves two purposes:
//   1. Lets TrustLedger call Arbitration without importing its full bytecode.
//   2. Forces Arbitration to implement exactly these functions (enforced at compile time).
// By depending only on the interface, TrustLedger is decoupled from Arbitration's internals.
// You could swap out the arbitration implementation without touching TrustLedger.

/// @title IArbitration
/// @author Kevin Le, Kellen Snider
/// @notice Minimal interface for TrustLedger to open disputes in the Arbitration contract.
interface IArbitration {
    // Called by TrustLedger when a client disputes submitted work.
    // The `payable` keyword means ETH is transferred alongside this call -
    // specifically, the arbitration fee pool deducted from the escrow amount.
    // Returns a unique disputeId so TrustLedger can track which dispute belongs
    // to which escrow contract.

    /// @notice Open a new dispute. Called by TrustLedger with the fee pool as msg.value.
    /// @param contractId     The TrustLedger escrow ID being disputed.
    /// @param client         Address of the client who hired the freelancer.
    /// @param freelancer     Address of the freelancer who was hired.
    /// @param contractAmount Total ETH in the escrow.
    /// @param feePool        The portion sent as msg.value for juror rewards.
    /// @return disputeId     The unique ID assigned to the newly created dispute.
    function openDispute(
        uint256 contractId,
        address client,
        address freelancer,
        uint256 contractAmount,
        uint256 feePool
    )
        external
        payable
        returns (uint256 disputeId);
}
