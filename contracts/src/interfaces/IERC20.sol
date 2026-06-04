// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// Minimal IERC20 subset needed by TrustLedger for stablecoin escrow support.
// We define this locally because the OZ forge submodule does not have a complete
// cryptography directory on macOS (file-system checkout limitation with the submodule).
// Only the two functions TrustLedger actually calls are declared here.

/// @title IERC20
/// @author Kevin Le, Kellen Snider
/// @notice Minimal ERC-20 interface for token transfers in and out of escrow.
interface IERC20 {
    // Pull tokens from a pre-approved account into the escrow contract.
    // Returns true on success; well-behaved ERC-20 tokens always return true
    // rather than reverting, so we check the return value.

    /// @notice Transfer tokens from `from` to `to`, consuming an allowance approved by `from`.
    /// @param from   Address whose tokens are pulled.
    /// @param to     Recipient address.
    /// @param amount Token units to transfer.
    /// @return result True if the transfer succeeded.
    function transferFrom(address from, address to, uint256 amount) external returns (bool result);

    // Send tokens held by this contract to a recipient (payout to client or freelancer).

    /// @notice Transfer tokens from the calling contract to `to`.
    /// @param to     Recipient address.
    /// @param amount Token units to transfer.
    /// @return result True if the transfer succeeded.
    function transfer(address to, uint256 amount) external returns (bool result);
}
