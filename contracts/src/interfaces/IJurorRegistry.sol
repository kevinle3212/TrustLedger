// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// Arbitration calls into JurorRegistry to check eligibility, lock/unlock jurors,
// and slash minority voters. Only the functions Arbitration actually needs are here.
// JurorRegistry's full public API (register, unstake, etc.) is not exposed
// because Arbitration has no business calling those.

/// @title IJurorRegistry
/// @author Kevin Le, Kellen Snider
/// @notice Minimal interface for Arbitration to interact with the juror staking registry.
interface IJurorRegistry {
    // ─── Shared data type
    // ─────────────────────────────────────────────────────
    // Structs defined in interfaces are importable by any contract that imports
    // the interface, avoiding duplication across the codebase.
    // Fields ordered for tight storage packing: addr(20)+active(1) share one slot.
    struct JurorInfo {
        address addr; // the juror's wallet address
        bool active; // false if stake drops below MIN_STAKE or juror explicitly exits
        uint256 stake; // ETH staked (in wei); must be ≥ MIN_STAKE to be eligible
        uint256 stakeUnlockTime; // unix timestamp after which the juror can unstake;
        // reset on every register() and addStake() call
        uint256 reputation; // starts at 100, decremented by 10 for each minority vote
        uint256 disputesParticipated; // lifetime count of disputes this juror participated in
        uint256 minorityVotes; // times the juror voted outside the majority window
        uint256 activeDisputes; // number of disputes currently locked (prevents unstaking mid-dispute)
    }

    // Increments activeDisputes by 1. Called when a juror commits a vote.
    // Prevents the juror from unstaking while a dispute is in progress.

    /// @notice Increment the juror's active dispute counter, locking their stake.
    /// @param juror The juror address to lock.
    function lockForDispute(address juror) external;

    // Decrements activeDisputes and increments disputesParticipated. Called when
    // the dispute is finalized, whether or not the juror revealed their vote.

    /// @notice Decrement the juror's active dispute counter and record participation.
    /// @param juror The juror address to unlock.
    function unlockFromDispute(address juror) external;

    // Deducts `amount` from the juror's stake as a penalty for voting in the
    // minority (i.e. their vote was far from the median ruling).
    // Also increments minorityVotes and decrements reputation by 10.

    /// @notice Slash a juror's stake for minority voting. The slashed ETH is forwarded to
    ///         the caller (Arbitration) so it can back the dispute's slashed pool.
    /// @param juror  The juror address to slash.
    /// @param amount The ETH amount to deduct from their stake (capped at current stake).
    /// @return slashAmt The ETH actually slashed and forwarded to the caller.
    function slash(address juror, uint256 amount) external returns (uint256 slashAmt);

    // Returns true if the juror is eligible to commit a vote:
    //   - active == true
    //   - stake >= MIN_STAKE
    //   - stakeUnlockTime has elapsed (ensures jurors have "skin in the game" for a full lock period)

    /// @notice Check if a juror is eligible to commit a vote.
    /// @param juror The juror address to check.
    /// @return result True if the juror is active, sufficiently staked, and past the lock period.
    function isEligible(address juror) external view returns (bool result);

    // Returns the full JurorInfo struct for inspection (used during slashing to
    // read the current stake before computing the slash amount).

    /// @notice Return the full JurorInfo struct for a given juror.
    /// @param juror The juror address to look up.
    /// @return result The juror's current info.
    function getJuror(address juror) external view returns (JurorInfo memory result);

    // Returns the flat list of all registered juror addresses.
    // Used by Arbitration's VRF fulfillment to sample a random subset as jurors.

    /// @notice Return every address that has ever called register().
    /// @return result Array of all registered juror wallet addresses.
    function getJurorList() external view returns (address[] memory result);

    // Returns the current active juror set: jurors whose stake is still ≥ MIN_STAKE and
    // who have not been deactivated by a full withdrawal or slash. Committee selection
    // samples this bounded set instead of the full historical list, preventing an
    // unbounded-gas DoS from cheap register/unstake churn.

    /// @notice Return the current active juror set used for bounded committee selection.
    /// @return result Array of currently active juror wallet addresses.
    function getActiveJurorList() external view returns (address[] memory result);
}
