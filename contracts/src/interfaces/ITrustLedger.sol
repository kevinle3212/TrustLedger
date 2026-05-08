// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// Arbitration only needs to call one function back on TrustLedger once jurors
// have reached a verdict. Depending on the full TrustLedger contract would create
// a circular import. Using a minimal interface breaks the cycle cleanly.

/// @title ITrustLedger
/// @author Kevin Le, Kellen Snider
/// @notice Minimal interface for Arbitration to call back into TrustLedger after a ruling.
interface ITrustLedger {
    // Called by Arbitration after jurors finalize their ruling.
    // completionPct: 0-100
    //   0   → client wins everything (freelancer did no work)
    //   100 → freelancer wins everything
    //   1-99 → partial split using the formula: freelancerPay = (2 * pct * amount) / 300

    /// @notice Execute a juror ruling, distributing escrow funds based on completion percentage.
    /// @param contractId    The TrustLedger escrow ID.
    /// @param completionPct The ruling completion percentage (0-100).
    function executeRuling(uint256 contractId, uint256 completionPct) external;
}
