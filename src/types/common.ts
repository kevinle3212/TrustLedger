// Shared primitive type aliases used across the TrustLedger frontend and any
// future backend services. These are intentionally framework-agnostic (plain
// template-literal types, no viem dependency) so they can be imported anywhere.

/**
 * A 20-byte EVM account or contract address in 0x-prefixed hex form
 * (for example `0x1234…abcd`).
 */
export type Address = `0x${string}`;

/**
 * A 0x-prefixed hex string of arbitrary length (transaction hash, signature,
 * encoded calldata, and so on).
 */
export type Hex = `0x${string}`;

/**
 * A 32-byte value in 0x-prefixed hex form — a `keccak256` digest or any
 * Solidity `bytes32` field.
 */
export type Bytes32 = `0x${string}`;
