// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// Interface for the on-chain reputation system.
// TrustLedger calls `rate()` when a contract reaches APPROVED or RESOLVED.
// Both parties rate each other - clients rate freelancers and vice versa.

/// @title IReputationRegistry
/// @author Kevin Le, Kellen Snider
/// @notice Interface for submitting and querying on-chain reputation scores.
interface IReputationRegistry {
    /// @notice Record a rating for a user. Only callable by TrustLedger.
    /// @param user  The wallet address being rated.
    /// @param score Rating score in the range [1, 100].
    function rate(address user, uint8 score) external;

    /// @notice Returns the cumulative score and total number of ratings for a user.
    ///         Caller computes average = numerator / denominator (handle division-by-zero).
    /// @param user The address to query.
    /// @return numerator   Sum of all scores the user has received.
    /// @return denominator Number of ratings submitted for that user.
    function averageRating(address user) external view returns (uint256 numerator, uint256 denominator);
}
