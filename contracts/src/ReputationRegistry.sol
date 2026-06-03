// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {IReputationRegistry} from "./interfaces/IReputationRegistry.sol";

// ReputationRegistry stores cumulative on-chain ratings submitted by TrustLedger
// after each completed or disputed contract.  Both the client and the freelancer
// can rate each other once per contract; TrustLedger enforces the "once-each" rule.
//
// Recovery mechanism: a score ≤ LOW_RATING_THRESHOLD enters the user into recovery
// mode.  Receiving RECOVERY_CONTRACTS_REQUIRED subsequent scores ≥ RECOVERY_SCORE_THRESHOLD
// resolves one pending recovery and applies a RECOVERY_BONUS synthetic rating that
// partially repairs the cumulative average.  A new low score resets the in-progress
// recovery streak but does not remove already-earned recoveries.
//
// `is IReputationRegistry` means this contract must implement every function in
// the interface. The compiler enforces this - a missing function is a compile error.

/// @title ReputationRegistry
/// @author Kevin Le, Kellen Snider
/// @notice On-chain reputation ledger for TrustLedger participants.
///         Only TrustLedger may write ratings; anyone may read them.
contract ReputationRegistry is IReputationRegistry {
    // ─── State
    // ───────────────────────────────────────────────────────────────

    /// @notice Scores at or below this value trigger a recovery period.
    uint8 public constant LOW_RATING_THRESHOLD = 30;

    /// @notice Scores at or above this value count as a successful rating toward recovery.
    uint8 public constant RECOVERY_SCORE_THRESHOLD = 70;

    /// @notice Number of successful ratings required to resolve one recovery period.
    uint8 public constant RECOVERY_CONTRACTS_REQUIRED = 3;

    /// @notice Synthetic score added to the cumulative total when recovery is achieved.
    ///         Acts as a partial reputation repair — equivalent to one extra 50-point rating.
    uint8 public constant RECOVERY_BONUS = 50;

    // `immutable` is set once in the constructor and never changes after deployment.
    // SCREAMING_SNAKE_CASE is required by the `immutable-vars-naming` solhint rule.

    /// @notice The TrustLedger contract that is authorised to call rate().
    address public immutable TRUST_LEDGER;

    // Running sum of all scores received by each address.
    // Average rating = _totalRating[user] / _ratingCount[user].
    mapping(address user => uint256 total) private _totalRating;

    // How many ratings each address has received.
    mapping(address user => uint256 count) private _ratingCount;

    // Number of low ratings (≤ LOW_RATING_THRESHOLD) not yet addressed by recovery.
    mapping(address user => uint256 pending) private _pendingRecoveries;

    // How many successful ratings (≥ RECOVERY_SCORE_THRESHOLD) have been received
    // since the last low rating or completed recovery streak.
    mapping(address user => uint256 progress) private _recoveryProgress;

    // ─── Events
    // ──────────────────────────────────────────────────────────────

    /// @notice Emitted each time a new rating is recorded.
    /// @param user  The wallet that was rated.
    /// @param score The score submitted (1-100).
    event Rated(address indexed user, uint8 indexed score);

    /// @notice Emitted when a user completes RECOVERY_CONTRACTS_REQUIRED successful
    ///         ratings and earns a RECOVERY_BONUS synthetic rating.
    /// @param user  The wallet that earned the recovery.
    /// @param bonus The synthetic score added to their cumulative total.
    event RecoveryAchieved(address indexed user, uint8 indexed bonus);

    // ─── Errors
    // ──────────────────────────────────────────────────────────────

    /// @notice Only the TRUST_LEDGER contract may call rate().
    error OnlyTrustLedger();

    /// @notice Score must be between 1 and 100 inclusive.
    error InvalidScore();

    /// @notice Constructor called with the zero address.
    error ZeroAddress();

    // ─── Constructor
    // ─────────────────────────────────────────────────────────

    /// @notice Deploys ReputationRegistry and binds it to TrustLedger.
    /// @param trustLedger_ Address of the deployed TrustLedger contract.
    constructor(address trustLedger_) {
        if (trustLedger_ == address(0)) {
            revert ZeroAddress();
        }
        TRUST_LEDGER = trustLedger_;
    }

    // ─── TrustLedger-only write
    // ───────────────────────────────────────────────

    /// @notice Record a rating. Only TrustLedger may call this. Emits {Rated}.
    ///         If the score is low (≤ LOW_RATING_THRESHOLD) the user enters recovery mode.
    ///         If the user is in recovery and the score is high (≥ RECOVERY_SCORE_THRESHOLD),
    ///         progress toward resolving one recovery period is advanced. When progress
    ///         reaches RECOVERY_CONTRACTS_REQUIRED the recovery resolves and a
    ///         RECOVERY_BONUS synthetic rating is added, emitting {RecoveryAchieved}.
    /// @param user  The address being rated.
    /// @param score Rating in [1, 100]; 1 = terrible, 100 = perfect.
    function rate(address user, uint8 score) external {
        if (msg.sender != TRUST_LEDGER) {
            revert OnlyTrustLedger();
        }
        if (score == 0 || score > 100) {
            revert InvalidScore();
        }

        _totalRating[user] += score;
        ++_ratingCount[user];
        emit Rated(user, score);

        if (score < LOW_RATING_THRESHOLD + 1) {
            // New low rating: enter/extend recovery mode and reset the current streak.
            ++_pendingRecoveries[user];
            _recoveryProgress[user] = 0;
        } else if (score > RECOVERY_SCORE_THRESHOLD - 1 && _pendingRecoveries[user] > 0) {
            // Successful rating while in recovery: advance the streak.
            uint256 progress = _recoveryProgress[user] + 1;
            if (progress > RECOVERY_CONTRACTS_REQUIRED - 1) {
                // One recovery resolved: apply bonus and reset streak.
                --_pendingRecoveries[user];
                _recoveryProgress[user] = 0;
                _totalRating[user] += RECOVERY_BONUS;
                ++_ratingCount[user];
                emit RecoveryAchieved(user, RECOVERY_BONUS);
            } else {
                _recoveryProgress[user] = progress;
            }
        }
    }

    // ─── View
    // ─────────────────────────────────────────────────────────────────

    /// @notice Returns the cumulative score sum and rating count for a user.
    ///         To get the average: average = numerator / denominator (check denominator > 0).
    /// @param user The address to look up.
    /// @return numerator   Sum of all scores received (including any recovery bonuses).
    /// @return denominator Number of ratings recorded (including any recovery bonus entries).
    function averageRating(address user) external view returns (uint256 numerator, uint256 denominator) {
        return (_totalRating[user], _ratingCount[user]);
    }

    /// @notice Returns the current recovery state for a user.
    /// @param user The address to query.
    /// @return pending  Number of low ratings not yet addressed (how many recovery periods remain).
    /// @return progress Number of successful ratings received toward resolving the current period.
    function recoveryStatus(address user) external view returns (uint256 pending, uint256 progress) {
        return (_pendingRecoveries[user], _recoveryProgress[user]);
    }
}
