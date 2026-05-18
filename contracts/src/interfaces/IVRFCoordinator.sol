// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// Minimal Chainlink VRF v2 Coordinator interface.
// Only the function Arbitration needs to request verifiable randomness is declared here.
// The coordinator calls `fulfillRandomWords(requestId, randomWords)` back on Arbitration
// once the randomness is available on-chain.

/// @title IVRFCoordinator
/// @author Oregon Blockchain Group
/// @notice Interface for requesting verifiable random words from Chainlink VRF v2.
interface IVRFCoordinator {
    /// @notice Request random words from the VRF coordinator.
    ///         The coordinator calls `fulfillRandomWords` on the calling contract when done.
    /// @param keyHash                     The gas lane key hash identifying the VRF job.
    /// @param subId                       The VRF subscription ID that funds this request.
    /// @param minimumRequestConfirmations Minimum confirmations before fulfillment.
    /// @param callbackGasLimit            Gas limit for the `fulfillRandomWords` callback.
    /// @param numWords                    How many random uint256 values to return.
    /// @return requestId                  Unique ID assigned to this randomness request.
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}
