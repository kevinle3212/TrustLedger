// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// MockVRFCoordinator replaces the real Chainlink VRF coordinator in Hardhat tests.
// It records the last request ID and exposes fulfillWithWords() so a test can
// manually push random words into Arbitration.fulfillRandomWords() without
// needing a live Chainlink node or subscription.

/// @title IVRFFulfiller
/// @author Oregon Blockchain Group
/// @notice Minimal interface for the Arbitration contract's VRF callback.
///         The real Chainlink coordinator calls fulfillRandomWords() on the requester;
///         MockVRFCoordinator calls it via fulfillWithWords() in tests.
interface IVRFFulfiller {
    /// @notice Deliver the requested random words to the consuming contract.
    /// @param requestId    The ID that was returned by requestRandomWords().
    /// @param randomWords  Array of random uint256 values.
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external;
}

/// @title MockVRFCoordinator
/// @author Oregon Blockchain Group
/// @notice Test-only stand-in for the Chainlink VRF v2 coordinator.
///         Implements the requestRandomWords() signature so Arbitration can call it,
///         then lets tests drive fulfillment manually via fulfillWithWords().
contract MockVRFCoordinator {
    // ─── State ────────────────────────────────────────────────────────────────

    // Monotonically increasing request ID counter — starts at 1 so 0 is never a valid ID.
    uint256 private _nextRequestId = 1;

    // Retained so tests can assert that a request was made and retrieve its ID.
    uint256 private _lastRequestId;

    // ─── IVRFCoordinator interface ────────────────────────────────────────────

    /// @notice Record a VRF randomness request and return a unique request ID.
    ///         Ignores all coordinator-specific parameters — they are only present
    ///         to satisfy the IVRFCoordinator interface that Arbitration calls.
    /// @return requestId Monotonically increasing ID assigned to this request.
    function requestRandomWords(
        bytes32, // keyHash — gas lane; ignored in tests
        uint64, // subId — VRF subscription; ignored in tests
        uint16, // minimumRequestConfirmations — ignored in tests
        uint32, // callbackGasLimit — ignored in tests
        uint32 // numWords — ignored; tests supply words manually via fulfillWithWords()
    )
        external
        returns (uint256 requestId)
    {
        // Capture current ID first, then advance the counter (prefix ++ is cheaper than postfix).
        requestId = _nextRequestId;
        ++_nextRequestId;
        _lastRequestId = requestId;
    }

    // ─── Test helper ──────────────────────────────────────────────────────────

    /// @notice Manually deliver random words to `target.fulfillRandomWords()`.
    ///         Call this from a test after requestRandomWords() has been triggered
    ///         to simulate the Chainlink node's callback without a live coordinator.
    /// @param target      The contract that requested randomness (Arbitration address).
    /// @param requestId   The ID returned by requestRandomWords() to fulfill.
    /// @param randomWords Array of random values to deliver.
    function fulfillWithWords(address target, uint256 requestId, uint256[] calldata randomWords) external {
        IVRFFulfiller(target).fulfillRandomWords(requestId, randomWords);
    }

    /// @notice Returns the request ID assigned to the most recent randomness request.
    ///         Allows tests to retrieve the ID after calling disputeWork() → openDispute().
    /// @return The last request ID issued by requestRandomWords().
    function lastRequestId() external view returns (uint256) {
        return _lastRequestId;
    }
}
