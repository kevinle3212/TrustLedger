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
// Run it with: forge script script/Deploy.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --broadcast

/// @title Deploy
/// @author Kevin Le, Kellen Snider
/// @notice Foundry deployment script for JurorRegistry, TrustLedger, and Arbitration.
contract Deploy is Script {

    /// @notice Reverts when a deployed contract lands at an unexpected address.
    error AddressMismatch();

    /// @notice Entry point — Foundry calls this function when executing the script.
    function run() external {

        // ── Read the private key from an environment variable ──────────────────
        // vm.envUint("VAR") reads the environment variable and parses it as uint256.
        // Private keys are 256-bit numbers. We never hardcode them in source files
        // (they'd be visible in git history forever).
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");

        // ── Broadcast: sign and send real transactions ─────────────────────────
        // Everything between startBroadcast and stopBroadcast is sent as a real
        // on-chain transaction signed by the private key above.
        // Without broadcast, `new Contract()` would be a dry-run simulation only.
        vm.startBroadcast(deployerPk);

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

        address deployer = vm.addr(deployerPk); // derive the deployer's address from the private key

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
        TrustLedger trustLedger = new TrustLedger(arbitrationAddr);       // nonce N+1

        // Now deploy Arbitration with the real addresses of the two contracts above.
        Arbitration arbitration = new Arbitration(                         // nonce N+2
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
