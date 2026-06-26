// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable no-console

// Foundry deployment script for the USDC StakingVault. It is intentionally separate from
// Deploy.s.sol: the core escrow/arbitration system and the staking vault deploy on their own
// schedules, and the vault needs a real ERC-20 (USDC) address that only exists per network.
import {Script, console} from "forge-std/Script.sol";
import {StakingVault} from "./../src/StakingVault.sol";

/// @title DeployStaking
/// @author Kevin Le
/// @notice Deploys {StakingVault} from environment configuration. No addresses are hardcoded:
///         the staking token (USDC), optional distinct reward token, and owner all come from env.
/// @dev    Required env: `STAKING_USDC_ADDRESS` (the USDC token for the target network).
///         Optional env: `STAKING_REWARDS_TOKEN` (defaults to the USDC address) and
///         `STAKING_VAULT_OWNER` (defaults to the broadcasting deployer).
///         Run: npm run foundry:deploy:staking:sepolia
contract DeployStaking is Script {
    /// @notice Reverts when the required staking-token address is missing or the zero address.
    error MissingStakingToken();

    /// @notice Entry point invoked by `forge script`.
    function run() external {
        // The USDC token address for the target network. There is no default — a wrong or
        // fabricated token address would create an unusable vault, so the deploy must fail loudly.
        address stakingToken = vm.envAddress("STAKING_USDC_ADDRESS");
        if (stakingToken == address(0)) {
            revert MissingStakingToken();
        }

        // Reward token defaults to the staking token (USDC rewards for USDC stake).
        address rewardsToken = vm.envOr("STAKING_REWARDS_TOKEN", stakingToken);

        vm.startBroadcast();

        // Owner defaults to the broadcasting deployer; override with STAKING_VAULT_OWNER to hand
        // the vault to a multisig at deploy time.
        address vaultOwner = vm.envOr("STAKING_VAULT_OWNER", msg.sender);

        StakingVault vault = new StakingVault(stakingToken, rewardsToken, vaultOwner);

        console.log("StakingVault:   ", address(vault));
        console.log("Staking token:  ", stakingToken);
        console.log("Rewards token:  ", rewardsToken);
        console.log("Vault owner:    ", vaultOwner);

        vm.stopBroadcast();
    }
}
