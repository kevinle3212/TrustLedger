// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable interface-starts-with-i

// Minimal Chainlink Data Feed interface for reading the ETH/USD spot price.
// We define this locally because the OZ forge submodule is partially broken on macOS;
// only the single function TrustLedger calls is declared here.

/// @title AggregatorV3Interface
/// @author Oregon Blockchain Group
/// @notice Chainlink price feed interface — used to record the ETH/USD price at escrow creation.
interface AggregatorV3Interface {
    /// @notice Returns the latest round data from the price feed.
    /// @return roundId         The round ID of this data point.
    /// @return answer          Price in 8 decimals (e.g. 200000000000 = $2 000.00).
    /// @return startedAt       Unix timestamp when the round started.
    /// @return updatedAt       Unix timestamp of the last on-chain update.
    /// @return answeredInRound The round in which the answer was computed.
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}
