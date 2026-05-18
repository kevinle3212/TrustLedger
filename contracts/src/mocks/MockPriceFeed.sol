// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time
// block.timestamp is intentional here — the mock returns it as the feed's
// updatedAt timestamp so callers that validate freshness don't reject the data.

// MockPriceFeed is a test-only stand-in for the Chainlink AggregatorV3Interface.
// Tests set an arbitrary price at construction or via setPrice(), then deploy
// TrustLedger with this contract wired as the price feed via initPriceFeed().
// This lets tests verify usdValueAtCreation without a live Chainlink node.

/// @title MockPriceFeed
/// @author Oregon Blockchain Group
/// @notice Test-only Chainlink AggregatorV3Interface substitute.
///         Returns a configurable int256 price from latestRoundData() so tests
///         can verify ETH/USD locking behaviour in TrustLedger.createContract().
contract MockPriceFeed {
    // ─── State ────────────────────────────────────────────────────────────────

    // The price returned by latestRoundData(). Stored as int256 to match the
    // Chainlink interface (negative prices indicate stale/invalid data in prod).
    int256 private _price;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @notice Deploy the mock feed with an initial price.
    /// @param initialPrice ETH/USD price in 8-decimal Chainlink format (e.g. 300000000000 = $3 000).
    constructor(int256 initialPrice) {
        _price = initialPrice;
    }

    // ─── Test helper ──────────────────────────────────────────────────────────

    /// @notice Override the price returned by latestRoundData(). Call from tests
    ///         to simulate different market conditions (e.g. zero/negative price).
    /// @param price New ETH/USD price in 8-decimal Chainlink format.
    function setPrice(int256 price) external {
        _price = price;
    }

    // ─── AggregatorV3Interface ────────────────────────────────────────────────

    /// @notice Returns the configured price alongside stub round metadata.
    ///         The returned timestamps equal block.timestamp so freshness checks pass.
    /// @return roundId          Stub round identifier (always 1).
    /// @return answer           The price set at construction or via setPrice().
    /// @return startedAt        block.timestamp (stub).
    /// @return updatedAt        block.timestamp (stub; satisfies freshness guards).
    /// @return answeredInRound  Stub value (always 1).
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, _price, block.timestamp, block.timestamp, 1);
    }
}
