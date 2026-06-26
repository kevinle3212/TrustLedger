// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time

// Imports are ordered by imported symbol name to satisfy solhint `imports-order`.
// - IERC20 / IERC20Metadata / SafeERC20: SafeERC20 normalizes non-standard ERC-20 return
//   values; IERC20Metadata reads the staking token's decimals (USDC = 6) once at deploy.
// - Ownable / Ownable2Step: two-step ownership so the owner role can never be handed to an
//   address that cannot accept it (a fat-fingered transfer would otherwise brick the vault).
// - Pausable: lets the owner halt new deposits during an incident without locking withdrawals.
// - ReentrancyGuard: `nonReentrant` blocks re-entry during token transfers.
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StakingVault
/// @author Kevin Le
/// @notice ERC-20 staking vault with a time-weighted reward accumulator. Built for USDC
///         staking (6-decimal token) but decimal-agnostic: rewards are tracked per staked
///         unit scaled by {PRECISION} (1e18), so 6-decimal accounting never truncates.
/// @dev    Reward accounting follows the audited Synthetix `StakingRewards` pattern. The
///         owner funds the reward pool with {notifyRewardAmount} over {rewardsDuration};
///         stakers accrue pro-rata to their stake and elapsed time. Stake and reward tokens
///         may be the same (USDC staked, USDC rewards) or distinct.
contract StakingVault is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Constants
    // ───────────────────────────────────────────────────────────

    /// @notice Fixed-point scale for the reward-per-token accumulator (1e18).
    ///         Multiplying before dividing at this scale keeps reward math exact for
    ///         low-decimal tokens such as USDC (6 decimals).
    uint256 public constant PRECISION = 1e18;

    /// @notice Upper bound on {rewardsDuration} (365 days). Caps how long a single reward
    ///         distribution can stretch and bounds the reward-rate rounding error.
    uint256 public constant MAX_REWARDS_DURATION = 365 days;

    // ─── Immutables
    // ──────────────────────────────────────────────────────────

    /// @notice Token users stake (USDC on production networks).
    IERC20 public immutable STAKING_TOKEN;

    /// @notice Token paid out as rewards. May equal {STAKING_TOKEN}.
    IERC20 public immutable REWARDS_TOKEN;

    /// @notice Decimals of {STAKING_TOKEN}, read once at deploy for off-chain display (USDC = 6).
    uint8 public immutable STAKING_TOKEN_DECIMALS;

    // ─── Reward schedule state
    // ───────────────────────────────────────────────────

    /// @notice Unix timestamp when the current reward distribution ends.
    uint256 public periodFinish;

    /// @notice Reward tokens distributed per second across all stakers during the active period.
    uint256 public rewardRate;

    /// @notice Length of a reward distribution period in seconds.
    uint256 public rewardsDuration = 7 days;

    /// @notice Last timestamp at which reward accounting was updated.
    uint256 public lastUpdateTime;

    /// @notice Accumulated reward per staked unit, scaled by {PRECISION}.
    uint256 public rewardPerTokenStored;

    // ─── Per-account state
    // ───────────────────────────────────────────────────────

    /// @notice Snapshot of {rewardPerTokenStored} at each account's last interaction.
    mapping(address account => uint256 paid) public userRewardPerTokenPaid;

    /// @notice Reward tokens earned and not yet claimed, per account.
    mapping(address account => uint256 reward) public rewards;

    // Total staked across all accounts.
    uint256 private _totalStaked;

    // Staked balance per account.
    mapping(address account => uint256 amount) private _balances;

    // ─── Events
    // ──────────────────────────────────────────────────────────────

    /// @notice Emitted when an account stakes tokens.
    /// @param account The staker.
    /// @param amount  Tokens staked (smallest units).
    event Staked(address indexed account, uint256 indexed amount);

    /// @notice Emitted when an account withdraws staked tokens.
    /// @param account The staker.
    /// @param amount  Tokens withdrawn (smallest units).
    event Withdrawn(address indexed account, uint256 indexed amount);

    /// @notice Emitted when an account claims accrued rewards.
    /// @param account The staker.
    /// @param reward  Reward tokens paid (smallest units).
    event RewardPaid(address indexed account, uint256 indexed reward);

    /// @notice Emitted when the owner funds a new reward distribution.
    /// @param reward The reward amount added to the schedule (smallest units).
    event RewardAdded(uint256 indexed reward);

    /// @notice Emitted when the owner changes the reward distribution duration.
    /// @param duration New duration in seconds.
    event RewardsDurationUpdated(uint256 indexed duration);

    /// @notice Emitted when the owner recovers a non-staking ERC-20 sent to the vault by mistake.
    /// @param token  The recovered token.
    /// @param amount Tokens recovered (smallest units).
    event Recovered(address indexed token, uint256 indexed amount);

    // ─── Errors
    // ──────────────────────────────────────────────────────────────

    /// @notice A token or owner address was the zero address.
    error ZeroAddress();

    /// @notice stake() or withdraw() called with a zero amount.
    error ZeroAmount();

    /// @notice withdraw() called for more than the account's staked balance.
    error InsufficientStake();

    /// @notice notifyRewardAmount() would set a reward rate the funded balance cannot cover.
    error RewardTooHigh();

    /// @notice setRewardsDuration() called before the current period finished, or with a bad duration.
    error InvalidRewardsDuration();

    /// @notice recoverERC20() called on the staking token (would let the owner take stakes).
    error CannotRecoverStakingToken();

    // ─── Modifiers
    // ───────────────────────────────────────────────────────────

    // Settle reward accounting for `account` before a state change. Updates the global
    // accumulator first, then the account's owed rewards and paid snapshot.
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    // ─── Constructor
    // ─────────────────────────────────────────────────────────

    /// @notice Deploys the vault bound to a staking token and a reward token.
    /// @param stakingToken_ Token users stake (e.g. USDC).
    /// @param rewardsToken_ Token paid as rewards (may equal `stakingToken_`).
    /// @param initialOwner_ Address that funds rewards and operates the vault.
    constructor(address stakingToken_, address rewardsToken_, address initialOwner_) Ownable(initialOwner_) {
        if (stakingToken_ == address(0) || rewardsToken_ == address(0) || initialOwner_ == address(0)) {
            revert ZeroAddress();
        }
        STAKING_TOKEN = IERC20(stakingToken_);
        REWARDS_TOKEN = IERC20(rewardsToken_);
        STAKING_TOKEN_DECIMALS = IERC20Metadata(stakingToken_).decimals();
    }

    // ─── External actions
    // ─────────────────────────────────────────────────────
    // Function order follows solhint `ordering`: external mutating, then external view,
    // then public mutating, then public view.

    /// @notice Stake `amount` of {STAKING_TOKEN}. Caller must approve the vault first.
    ///         Emits {Staked}.
    /// @param amount Tokens to stake (smallest units; USDC has 6 decimals).
    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) {
            revert ZeroAmount();
        }
        _totalStaked += amount;
        _balances[msg.sender] += amount;
        // Pull tokens last; SafeERC20 reverts if the transfer fails. Accounting is updated
        // before the external call, and `nonReentrant` blocks re-entry regardless.
        STAKING_TOKEN.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraw the entire staked balance and claim rewards in one transaction.
    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /// @notice Start or top up a reward distribution of `reward` tokens over {rewardsDuration}.
    ///         The reward tokens must already be held by the vault. Emits {RewardAdded}.
    /// @dev    Leftover rewards from an unfinished period roll into the new rate. The new
    ///         rate is checked against the vault's reward-token balance so the schedule can
    ///         always be paid (guards against a too-high rate from rounding or underfunding).
    /// @param reward Reward tokens to distribute this period (smallest units).
    function notifyRewardAmount(uint256 reward) external onlyOwner updateReward(address(0)) {
        // `block.timestamp + 1 > periodFinish` is the strict-inequality form of
        // `block.timestamp >= periodFinish` (solhint `gas-strict-inequalities`); the +1 cannot
        // overflow a uint256 timestamp.
        if (block.timestamp + 1 > periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        // The vault must hold enough reward tokens to cover the full new period; otherwise
        // late claimers could be left short. When stake and reward tokens are the same, the
        // staked principal is excluded so it can never be paid out as rewards.
        uint256 balance = REWARDS_TOKEN.balanceOf(address(this));
        if (REWARDS_TOKEN == STAKING_TOKEN) {
            balance -= _totalStaked;
        }
        if (rewardRate > balance / rewardsDuration) {
            revert RewardTooHigh();
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    /// @notice Set the reward distribution duration. Only allowed once the current period
    ///         has finished. Emits {RewardsDurationUpdated}.
    /// @param duration New duration in seconds (1 … {MAX_REWARDS_DURATION}).
    function setRewardsDuration(uint256 duration) external onlyOwner {
        if (block.timestamp < periodFinish) {
            revert InvalidRewardsDuration();
        }
        if (duration == 0 || duration > MAX_REWARDS_DURATION) {
            revert InvalidRewardsDuration();
        }
        rewardsDuration = duration;
        emit RewardsDurationUpdated(duration);
    }

    /// @notice Pause new deposits during an incident. Withdrawals and reward claims stay open.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume deposits after a pause.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Recover an ERC-20 accidentally sent to the vault. The staking token is blocked
    ///         so staked principal can never be swept. Emits {Recovered}.
    /// @param token  Token to recover.
    /// @param amount Amount to recover (smallest units).
    function recoverERC20(address token, uint256 amount) external onlyOwner {
        if (token == address(STAKING_TOKEN)) {
            revert CannotRecoverStakingToken();
        }
        IERC20(token).safeTransfer(owner(), amount);
        emit Recovered(token, amount);
    }

    // ─── External views
    // ──────────────────────────────────────────────────────

    /// @notice Total tokens staked in the vault.
    /// @return result Combined staked balance of all accounts (smallest units).
    function totalStaked() external view returns (uint256 result) {
        return _totalStaked;
    }

    /// @notice Staked balance of a single account.
    /// @param account The staker.
    /// @return result The account's staked balance (smallest units).
    function balanceOf(address account) external view returns (uint256 result) {
        return _balances[account];
    }

    /// @notice Total reward tokens scheduled across the full active period.
    /// @return result rewardRate × rewardsDuration (smallest units).
    function getRewardForDuration() external view returns (uint256 result) {
        return rewardRate * rewardsDuration;
    }

    // ─── Public actions
    // ──────────────────────────────────────────────────────
    // `public` (not `external`) so {exit} can call them internally.

    /// @notice Withdraw `amount` of previously staked tokens. Emits {Withdrawn}.
    /// @param amount Tokens to withdraw (smallest units).
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        if (amount == 0) {
            revert ZeroAmount();
        }
        if (amount > _balances[msg.sender]) {
            revert InsufficientStake();
        }
        _totalStaked -= amount;
        _balances[msg.sender] -= amount;
        STAKING_TOKEN.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Claim all accrued rewards for the caller. Emits {RewardPaid} when non-zero.
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            REWARDS_TOKEN.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    // ─── Public views
    // ────────────────────────────────────────────────────────

    /// @notice The later boundary of reward accrual: now, or the period end if it has passed.
    /// @return result min(block.timestamp, periodFinish).
    function lastTimeRewardApplicable() public view returns (uint256 result) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /// @notice Current accumulated reward per staked unit, scaled by {PRECISION}.
    /// @return result The reward-per-token accumulator.
    function rewardPerToken() public view returns (uint256 result) {
        if (_totalStaked == 0) {
            // No stake means no accrual; the accumulator holds at its last value.
            return rewardPerTokenStored;
        }
        uint256 elapsed = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (elapsed * rewardRate * PRECISION) / _totalStaked;
    }

    /// @notice Reward tokens an account has earned but not yet claimed.
    /// @param account The staker.
    /// @return result Claimable reward (smallest units).
    function earned(address account) public view returns (uint256 result) {
        uint256 perToken = rewardPerToken() - userRewardPerTokenPaid[account];
        return (_balances[account] * perToken) / PRECISION + rewards[account];
    }
}
