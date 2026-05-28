// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// MockERC20 is a minimal ERC-20 token used exclusively in Hardhat tests.
// It exposes a `mint()` function so tests can freely fund wallets without
// needing a real token deployment. It is never deployed to any live network.

/// @title MockERC20
/// @author Kevin Le, Kellen Snider
/// @notice Test-only ERC-20 token. Provides mint, transfer, approve, and transferFrom.
///         Implements the same interface surface as IERC20 that TrustLedger calls.
contract MockERC20 {
    // ─── State ────────────────────────────────────────────────────────────────

    string private constant _NAME = "Mock Token";
    string private constant _SYMBOL = "MOCK";
    uint8 private constant _DECIMALS = 18;

    /// @notice Running total of all minted tokens.
    uint256 public totalSupply;

    /// @notice Token balance per wallet address.
    mapping(address holder => uint256 balance) public balanceOf;

    /// @notice Spend allowances: owner → spender → approved amount.
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted on every token transfer, including mints (from = address(0)).
    /// @param from   Source address; address(0) for mints.
    /// @param to     Destination address.
    /// @param value  Number of tokens moved.
    event Transfer(address indexed from, address indexed to, uint256 indexed value);

    /// @notice Emitted when an owner approves a spender.
    /// @param owner   Token holder granting the allowance.
    /// @param spender Address allowed to spend on behalf of owner.
    /// @param value   Approved spend amount.
    event Approval(address indexed owner, address indexed spender, uint256 indexed value);

    // ─── Custom Errors ────────────────────────────────────────────────────────

    /// @notice Sender does not hold enough tokens for the requested transfer.
    error InsufficientBalance();

    /// @notice Spender has not been approved for the requested amount.
    error InsufficientAllowance();

    // ─── Test-only helper ─────────────────────────────────────────────────────

    /// @notice Create tokens out of thin air and credit them to `to`. Test-only.
    /// @param to     Recipient address.
    /// @param amount Number of tokens to mint (in smallest units).
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    // ─── ERC-20 interface ─────────────────────────────────────────────────────

    /// @notice Human-readable token name (satisfies ERC-20 metadata interface).
    function name() external pure returns (string memory) { return _NAME; }

    /// @notice Short token ticker symbol.
    function symbol() external pure returns (string memory) { return _SYMBOL; }

    /// @notice Number of decimal places (matches standard ERC-20 convention).
    function decimals() external pure returns (uint8) { return _DECIMALS; }

    /// @notice Approve `spender` to transfer up to `amount` on behalf of the caller.
    /// @param spender Address being approved.
    /// @param amount  Maximum tokens the spender may transfer.
    /// @return        Always true (reverts on failure).
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @notice Transfer `amount` tokens from the caller to `to`.
    /// @param to     Destination address.
    /// @param amount Number of tokens to send.
    /// @return       Always true (reverts on failure).
    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount) revert InsufficientBalance();
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /// @notice Transfer `amount` tokens from `from` to `to` using the caller's allowance.
    /// @param from   Source address (must have pre-approved the caller).
    /// @param to     Destination address.
    /// @param amount Number of tokens to move.
    /// @return       Always true (reverts on failure).
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        if (allowance[from][msg.sender] < amount) revert InsufficientAllowance();
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
