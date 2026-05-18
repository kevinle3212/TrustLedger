// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable no-console
// solhint-disable function-max-lines

// forge-std is Foundry's standard library. `Script` is the base contract for
// deployment scripts. It provides `vm` cheat codes (envUint, startBroadcast, etc.)
// and `console` for logging during the run.
import {Script, console} from "forge-std/Script.sol";
import {JurorRegistry} from "../src/JurorRegistry.sol";
import {Arbitration} from "../src/Arbitration.sol";
import {TrustLedger} from "../src/TrustLedger.sol";

// Any Foundry script is a contract that extends Script.
// Run via npm: npm run foundry:deploy:sepolia
// Run manually: forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $KEY --broadcast --verify

/// @title Deploy
/// @author Kevin Le, Kellen Snider
/// @notice Foundry deployment script for JurorRegistry, TrustLedger, and Arbitration.
contract Deploy is Script {
    /// @notice Reverts when a deployed contract lands at an unexpected address.
    error AddressMismatch();

    /// @notice Entry point — Foundry calls this function when executing the script.
    function run() external {
        // ── Broadcast: sign and send real transactions ─────────────────────────
        // vm.startBroadcast() with no arguments uses the --private-key / --account
        // passed on the CLI. Everything between startBroadcast and stopBroadcast is
        // sent as a real on-chain transaction. Without --broadcast on the CLI, this
        // is a dry-run simulation only.
        vm.startBroadcast();

        // ── Circular dependency problem ────────────────────────────────────────
        // TrustLedger needs Arbitration's address (immutable in constructor).
        // Arbitration needs TrustLedger's address (immutable in constructor).
        // JurorRegistry needs Arbitration's address.
        // → All three constructors need addresses that don't exist yet when they run.
        //
        // Solution: use vm.computeCreateAddress() to predict where a contract will
        // land BEFORE it's deployed. On EVM, a contract's address is deterministic:
        //   address = keccak256(RLP(deployer_address, nonce))[12:]
        // The deployer's nonce increments with each transaction. So:
        //   nonce N   → JurorRegistry
        //   nonce N+1 → TrustLedger
        //   nonce N+2 → Arbitration
        // We can compute nonce N+2's address before deploying anything.

        address deployer = msg.sender; // the address derived from --private-key on the CLI

        // vm.getNonce() returns the current transaction count (nonce) for the account.
        // The next contract deployed will be at nonce, then nonce+1, then nonce+2.
        uint256 nonce = vm.getNonce(deployer);

        // Precompute where Arbitration and TrustLedger will land.
        address arbitrationAddr = vm.computeCreateAddress(deployer, nonce + 2);
        address trustLedgerAddr = vm.computeCreateAddress(deployer, nonce + 1);

        // ── Deploy in the exact nonce order we pre-computed ─────────────────────
        // `new JurorRegistry(arbitrationAddr)` compiles to a CREATE opcode.
        // We pass the precomputed arbitrationAddr even though Arbitration doesn't
        // exist yet — JurorRegistry just stores it and never calls it during deploy.
        JurorRegistry jurorRegistry = new JurorRegistry(arbitrationAddr); // nonce N

        // Same pattern: TrustLedger stores arbitrationAddr as an immutable.
        TrustLedger trustLedger = new TrustLedger(arbitrationAddr); // nonce N+1

        // Now deploy Arbitration with the real addresses of the two contracts above.
        Arbitration arbitration = new Arbitration( // nonce N+2
            address(trustLedger),
            address(jurorRegistry)
        );

        // ── Sanity checks: verify the addresses match our predictions ───────────
        // If the nonce was different than expected (e.g. a prior failed tx incremented it),
        // the addresses would be wrong and the contracts would be broken.
        if (address(arbitration) != arbitrationAddr) revert AddressMismatch();
        if (address(trustLedger) != trustLedgerAddr) revert AddressMismatch();

        // ── Log deployed addresses ─────────────────────────────────────────────
        // console.log writes to stdout during the script run. Not included in the
        // on-chain transaction — purely for operator convenience.
        console.log("JurorRegistry:", address(jurorRegistry));
        console.log("TrustLedger:  ", address(trustLedger));
        console.log("Arbitration:  ", address(arbitration));

        // Stop signing/broadcasting transactions.
        vm.stopBroadcast();
    }
}
