// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {IReputationRegistry} from "./interfaces/IReputationRegistry.sol";

// ReputationRegistry stores cumulative on-chain ratings submitted by TrustLedger
// after each completed or disputed contract.  Both the client and the freelancer
// can rate each other once per contract; TrustLedger enforces the "once-each" rule.
//
// `is IReputationRegistry` means this contract must implement every function in
// the interface. The compiler enforces this — a missing function is a compile error.

/// @title ReputationRegistry
/// @author Kevin Le, Kellen Snider
/// @notice On-chain reputation ledger for TrustLedger participants.
///         Only TrustLedger may write ratings; anyone may read them.
contract ReputationRegistry is IReputationRegistry {
    // ─── State ───────────────────────────────────────────────────────────────

    // `immutable` is set once in the constructor and never changes after deployment.
    // SCREAMING_SNAKE_CASE is required by the `immutable-vars-naming` solhint rule.

    /// @notice The TrustLedger contract that is authorised to call rate().
    address public immutable TRUST_LEDGER;

    // Running sum of all scores received by each address.
    // Average rating = _totalRating[user] / _ratingCount[user].
    mapping(address user => uint256 total) private _totalRating;

    // How many ratings each address has received.
    mapping(address user => uint256 count) private _ratingCount;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted each time a new rating is recorded.
    /// @param user  The wallet that was rated.
    /// @param score The score submitted (1–100).
    event Rated(address indexed user, uint8 indexed score);

    // ─── Errors ──────────────────────────────────────────────────────────────

    /// @notice Only the TRUST_LEDGER contract may call rate().
    error OnlyTrustLedger();

    /// @notice Score must be between 1 and 100 inclusive.
    error InvalidScore();

    /// @notice Constructor called with the zero address.
    error ZeroAddress();

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Deploys ReputationRegistry and binds it to TrustLedger.
    /// @param trustLedger_ Address of the deployed TrustLedger contract.
    constructor(address trustLedger_) {
        if (trustLedger_ == address(0)) revert ZeroAddress();
        TRUST_LEDGER = trustLedger_;
    }

    // ─── TrustLedger-only write ───────────────────────────────────────────────

    /// @notice Record a rating. Only TrustLedger may call this. Emits {Rated}.
    /// @param user  The address being rated.
    /// @param score Rating in [1, 100]; 1 = terrible, 100 = perfect.
    function rate(address user, uint8 score) external {
        if (msg.sender != TRUST_LEDGER) revert OnlyTrustLedger();
        if (score == 0 || score > 100) revert InvalidScore();
        _totalRating[user] += score;
        ++_ratingCount[user];
        emit Rated(user, score);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice Returns the cumulative score sum and rating count for a user.
    ///         To get the average: average = numerator / denominator (check denominator > 0).
    /// @param user The address to look up.
    /// @return numerator   Sum of all scores received.
    /// @return denominator Number of ratings recorded.
    function averageRating(address user) external view returns (uint256 numerator, uint256 denominator) {
        return (_totalRating[user], _ratingCount[user]);
    }
}
