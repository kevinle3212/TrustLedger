// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable no-console

// Foundry script that funds a deployed StakingVault's reward pool deterministically. It is the
// companion to DeployStaking.s.sol: deploy creates the vault, this funds the reward schedule.
// The broadcaster must be the vault owner and must already hold REWARD tokens — the script
// transfers them into the vault and starts the distribution via notifyRewardAmount, so the
// reward setup is one reproducible command instead of ad-hoc transfers.
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Script, console} from "forge-std/Script.sol";
import {StakingVault} from "./../src/StakingVault.sol";

/// @title FundStaking
/// @author Kevin Le
/// @notice Funds a {StakingVault} reward pool: transfers reward tokens into the vault and opens a
///         distribution over the vault's configured `rewardsDuration`. All inputs come from env.
/// @dev    Required env: `STAKING_VAULT_ADDRESS` (deployed vault) and `STAKING_REWARD_AMOUNT`
///         (reward tokens in smallest units; USDC has 6 decimals, so 1000 USDC = 1000000000).
///         The broadcasting account must be the vault owner and hold at least the reward amount of
///         the vault's reward token. Run: npm run foundry:fund:staking:sepolia
contract FundStaking is Script {
    using SafeERC20 for IERC20;

    /// @notice Reverts when the required vault address is missing or the zero address.
    error MissingVaultAddress();

    /// @notice Reverts when the reward amount is zero.
    error ZeroRewardAmount();

    /// @notice Entry point invoked by `forge script`.
    function run() external {
        address vaultAddress = vm.envAddress("STAKING_VAULT_ADDRESS");
        if (vaultAddress == address(0)) {
            revert MissingVaultAddress();
        }

        uint256 rewardAmount = vm.envUint("STAKING_REWARD_AMOUNT");
        if (rewardAmount == 0) {
            revert ZeroRewardAmount();
        }

        StakingVault vault = StakingVault(vaultAddress);
        IERC20 rewardsToken = vault.REWARDS_TOKEN();

        vm.startBroadcast();

        // Move the reward tokens into the vault, then open the distribution. notifyRewardAmount
        // checks the vault holds enough to cover the full period, so funding must happen first.
        rewardsToken.safeTransfer(vaultAddress, rewardAmount);
        vault.notifyRewardAmount(rewardAmount);

        vm.stopBroadcast();

        console.log("Vault funded: ", vaultAddress);
        console.log("Reward token: ", address(rewardsToken));
        console.log("Reward amount:", rewardAmount);
        console.log("Period finish:", vault.periodFinish());
    }
}
