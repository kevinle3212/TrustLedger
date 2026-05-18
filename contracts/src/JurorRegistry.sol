// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time

// ReentrancyGuard adds a `nonReentrant` modifier.
// Reentrancy is an attack where a malicious contract calls back into this contract
// during an ETH transfer before the first call finishes, letting it drain funds twice.
// The guard uses a simple lock flag to prevent any re-entry.
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Import only what we need from our own interface. The struct JurorInfo is defined
// there so both Arbitration and JurorRegistry share the same type definition.
import {IJurorRegistry} from "./interfaces/IJurorRegistry.sol";

// `is IJurorRegistry` means JurorRegistry must implement every function declared
// in the interface. The compiler enforces this — if a function is missing it won't compile.
// `is ReentrancyGuard` mixes in the reentrancy protection.

/// @title JurorRegistry
/// @author Kevin Le, Kellen Snider
/// @notice Registry where anyone can stake ETH to become a juror eligible to vote in TrustLedger disputes.
///         Arbitration slashes minority voters and locks stake during active disputes.
contract JurorRegistry is IJurorRegistry, ReentrancyGuard {
    // ─── Constants ───────────────────────────────────────────────────────────
    // `constant` means the value is baked into the bytecode at compile time —
    // reading it costs zero gas because it never touches storage.

    /// @notice Minimum ETH required to register as a juror (0.01 ETH).
    uint256 public constant MIN_STAKE = 0.01 ether;

    /// @notice Period stake is locked after deposit before eligibility activates (7 days).
    uint256 public constant STAKE_LOCK_PERIOD = 7 days;

    /// @notice Stake slashed from minority voters in basis points (10%).
    uint256 public constant SLASH_BPS = 1000;

    /// @notice Denominator for basis-point arithmetic (10 000 bps = 100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ─── State ───────────────────────────────────────────────────────────────
    // State variables are stored on-chain in the contract's storage slot.
    // Reading/writing them costs gas proportional to the data size.

    // The address of the Arbitration contract. Only Arbitration is allowed to call
    // lockForDispute / unlockFromDispute / slash. This is NOT immutable because
    // JurorRegistry is deployed before Arbitration (to avoid circular dependency),
    // so we pass the pre-computed address in the constructor and just store it.

    /// @notice Address of the Arbitration contract; the only caller allowed to lock, unlock, and slash.
    address public arbitration;

    // Maps each juror address to their JurorInfo struct.
    // `private` means external callers must use the `getJuror()` view function.
    mapping(address juror => JurorInfo info) private _jurors;

    // A flat list of all juror addresses ever registered.
    // Used by `eligibleJurorCount()` to iterate — acceptable because the juror pool
    // is expected to be small (hundreds, not millions).
    address[] private _jurorList;

    // ─── Events ──────────────────────────────────────────────────────────────
    // Events are cheap logs emitted to the blockchain. Off-chain apps (front-ends,
    // indexers) listen for them to track state changes without reading storage.
    // `indexed` fields can be filtered efficiently by block explorers.

    /// @notice Emitted when a new juror registers.
    /// @param juror The juror's address.
    /// @param stake ETH staked on registration (wei).
    event Registered(address indexed juror, uint256 indexed stake);

    /// @notice Emitted when a juror adds stake.
    /// @param juror The juror's address.
    /// @param added Additional ETH deposited (wei).
    /// @param total New total stake (wei).
    event StakeAdded(address indexed juror, uint256 indexed added, uint256 indexed total);

    /// @notice Emitted when a juror withdraws stake.
    /// @param juror  The juror's address.
    /// @param amount ETH withdrawn (wei).
    event Unstaked(address indexed juror, uint256 indexed amount);

    /// @notice Emitted when a juror's stake is slashed by Arbitration.
    /// @param juror  The juror's address.
    /// @param amount ETH deducted (wei).
    event Slashed(address indexed juror, uint256 indexed amount);

    /// @notice Emitted when a juror's reputation changes after slashing.
    /// @param juror      The juror's address.
    /// @param reputation New reputation score.
    event ReputationUpdated(address indexed juror, uint256 indexed reputation);

    // ─── Errors ──────────────────────────────────────────────────────────────
    // Custom errors (introduced in Solidity 0.8.4) are cheaper than require()
    // with a string message because they encode as just the 4-byte function selector.
    // They also show up by name in wallets and block explorers.

    /// @notice register() called by an already-active juror.
    error AlreadyRegistered();

    /// @notice addStake or unstake called by an address not in the registry.
    error NotRegistered();

    /// @notice ETH sent is less than MIN_STAKE.
    error StakeBelowMinimum();

    /// @notice Trying to unstake before STAKE_LOCK_PERIOD has elapsed.
    error StakeLocked();

    /// @notice Trying to unstake while locked in an active dispute.
    error HasActiveDisputes();

    /// @notice Trying to unstake more than the current stake balance.
    error InsufficientStake();

    /// @notice Caller is not the Arbitration contract.
    error OnlyArbitration();

    /// @notice Constructor called with the zero address.
    error ZeroAddress();

    /// @notice Low-level ETH transfer to the recipient failed.
    error EthTransferFailed();

    // ─── Modifiers ───────────────────────────────────────────────────────────
    // A modifier is a code block that wraps a function. `_;` is where the
    // function body executes. The check runs before `_;`.

    modifier onlyArbitration() {
        _onlyArbitration(); // extracted to a function to reduce bytecode per call site
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────
    // Runs exactly once when the contract is deployed.

    /// @notice Deploys JurorRegistry and binds it to the Arbitration contract.
    /// @param arbitration_ Address of the Arbitration contract.
    constructor(address arbitration_) {
        // Reject the zero address — a typo here would brick the contract's
        // ability to call back into Arbitration.
        if (arbitration_ == address(0)) revert ZeroAddress();
        arbitration = arbitration_;
    }

    // ─── Public actions ──────────────────────────────────────────────────────

    // Anyone can register as a juror by sending at least MIN_STAKE ETH.
    // `external payable` — callable only from outside the contract, accepts ETH.
    // `msg.value` is the amount of ETH sent with the transaction (in wei).

    /// @notice Register as a juror by staking ETH. Emits {Registered}.
    function register() external payable {
        if (_jurors[msg.sender].active) revert AlreadyRegistered();
        if (msg.value < MIN_STAKE) revert StakeBelowMinimum();

        // Write the new juror into storage. Struct literal syntax assigns every field.
        _jurors[msg.sender] = JurorInfo({
            addr: msg.sender,
            stake: msg.value, // ETH sent becomes their stake
            stakeUnlockTime: block.timestamp + STAKE_LOCK_PERIOD, // can't unstake for 7 days
            reputation: 100, // starts at max reputation
            disputesParticipated: 0,
            minorityVotes: 0,
            active: true,
            activeDisputes: 0
        });

        // Push to the list so we can iterate over all jurors later.
        _jurorList.push(msg.sender);

        emit Registered(msg.sender, msg.value);
    }

    // A registered juror can top up their stake at any time.
    // Adding stake resets the lock period — you can't deposit and immediately withdraw.

    /// @notice Add more stake to an existing juror registration. Emits {StakeAdded}.
    function addStake() external payable {
        if (!_jurors[msg.sender].active) revert NotRegistered();
        if (msg.value == 0) revert StakeBelowMinimum();

        _jurors[msg.sender].stake += msg.value;

        // Reset the lock timer so the new stake is committed for another full period.
        _jurors[msg.sender].stakeUnlockTime = block.timestamp + STAKE_LOCK_PERIOD;

        emit StakeAdded(msg.sender, msg.value, _jurors[msg.sender].stake);
    }

    // Withdraw some or all stake. Three safety checks prevent abuse:
    //   1. Lock period — skin in the game; can't register and immediately exit.
    //   2. Active disputes — can't pull stake while judging a live case.
    //   3. Sufficient balance — can't withdraw more than you deposited.
    // `nonReentrant` prevents a malicious receive() hook from calling unstake again
    // before the first call updates the storage balance.

    /// @notice Withdraw stake. Subject to lock period and active-dispute checks. Emits {Unstaked}.
    /// @param amount ETH to withdraw (wei).
    function unstake(uint256 amount) external nonReentrant {
        JurorInfo storage j = _jurors[msg.sender]; // `storage` = reference to on-chain data
        if (!j.active) revert NotRegistered();
        if (block.timestamp < j.stakeUnlockTime) revert StakeLocked();
        if (j.activeDisputes > 0) revert HasActiveDisputes();
        if (amount > j.stake) revert InsufficientStake();

        j.stake -= amount;

        // Deactivate the juror if they've withdrawn below the minimum.
        // They can register again later if they want.
        if (j.stake < MIN_STAKE) {
            j.active = false;
        }

        // Low-level ETH transfer. `call` is preferred over `transfer` because
        // `transfer` forwards only 2300 gas (which can fail for smart contract wallets).
        // `call` forwards all available gas and returns a success boolean.
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert EthTransferFailed();

        emit Unstaked(msg.sender, amount);
    }

    // ─── Arbitration-only actions ─────────────────────────────────────────────
    // These three functions are the bridge between Arbitration and JurorRegistry.
    // Only the Arbitration contract address set in the constructor can call them.

    // Called when a juror commits a vote. Increments their active dispute counter
    // so they can't unstake and disappear mid-dispute.

    /// @notice Increment a juror's active dispute counter. Called only by Arbitration.
    /// @param juror The juror's address.
    function lockForDispute(address juror) external onlyArbitration {
        ++_jurors[juror].activeDisputes;
    }

    // Called for every juror when a dispute is finalized (win or lose).
    // Decrements their lock counter and records another dispute in their history.

    /// @notice Decrement a juror's active dispute counter after finalization. Called only by Arbitration.
    /// @param juror The juror's address.
    function unlockFromDispute(address juror) external onlyArbitration {
        JurorInfo storage j = _jurors[juror];
        if (j.activeDisputes > 0) --j.activeDisputes; // guard against underflow
        ++j.disputesParticipated;
    }

    // Called for minority-vote jurors and no-reveal jurors after finalization.
    // Deducts `amount` from their stake as a penalty for dishonest/lazy behavior.
    // Also tracks their minority vote count and reduces their reputation score.

    /// @notice Slash a juror's stake as a penalty for minority voting or failing to reveal.
    ///         Emits {Slashed} and {ReputationUpdated}.
    /// @param juror  The juror's address.
    /// @param amount ETH to slash (wei); capped at current stake.
    function slash(address juror, uint256 amount) external onlyArbitration {
        JurorInfo storage j = _jurors[juror];

        // Cap the slash at the juror's remaining stake to avoid underflow.
        uint256 slashAmt = amount < j.stake ? amount : j.stake;
        j.stake -= slashAmt;
        ++j.minorityVotes;

        // Reputation decays by 10 per minority vote, flooring at 0.
        if (j.reputation > 10) {
            j.reputation -= 10;
        } else {
            j.reputation = 0;
        }

        // Deactivate if slashed below minimum — prevents them from voting again
        // on another dispute until they top up their stake.
        if (j.stake < MIN_STAKE) j.active = false;

        emit Slashed(juror, slashAmt);
        emit ReputationUpdated(juror, j.reputation);
    }

    // ─── View functions ───────────────────────────────────────────────────────
    // `view` functions read from storage but never write. They're free to call
    // off-chain (no gas). On-chain calls from another contract still cost gas.

    // Returns true only when all three eligibility conditions are met simultaneously.
    // Arbitration calls this before allowing a juror to commit a vote.

    /// @notice Returns true if the juror is currently eligible to vote.
    /// @param juror The juror's address.
    /// @return      True when active, stake ≥ MIN_STAKE, and lock period has elapsed.
    function isEligible(address juror) external view returns (bool) {
        JurorInfo storage j = _jurors[juror];
        return j.active && j.stake > MIN_STAKE - 1 && block.timestamp > j.stakeUnlockTime - 1;
    }

    // Returns the full JurorInfo struct. Arbitration uses this to read the stake
    // amount before computing how much to slash (10% of current stake).

    /// @notice Returns the full JurorInfo struct for a given address.
    /// @param juror The juror's address.
    /// @return      A memory copy of the JurorInfo struct.
    function getJuror(address juror) external view returns (JurorInfo memory) {
        // `memory` means a copy is returned, not a storage reference.
        return _jurors[juror];
    }

    // Returns the array of all registered juror addresses.
    // Used off-chain to build UIs or monitor pool size.

    /// @notice Returns all registered juror addresses.
    /// @return Array of every address that has ever called register().
    function getJurorList() external view returns (address[] memory) {
        return _jurorList;
    }

    // Counts how many jurors are currently eligible to vote.
    // Iterates the entire list — this is fine for a small registry but would
    // need a different pattern (e.g. a separate counter) for a very large pool.

    /// @notice Counts currently eligible jurors by iterating the full registry.
    /// @return count Number of jurors currently meeting all eligibility criteria.
    function eligibleJurorCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < _jurorList.length; ++i) {
            JurorInfo storage j = _jurors[_jurorList[i]];
            if (j.active && j.stake > MIN_STAKE - 1 && block.timestamp > j.stakeUnlockTime - 1) {
                ++count;
            }
        }
        // Solidity named return: `count` was declared in the signature, so no
        // explicit `return count;` is needed — it's returned automatically.
    }

    // ─── Internal access control ──────────────────────────────────────────────

    // Internal function containing the actual access check.
    // Splitting modifier logic into a private function reduces contract deploy size
    // because the compiler can share one copy of the check instead of inlining it
    // at every call site.
    function _onlyArbitration() internal view {
        if (msg.sender != arbitration) revert OnlyArbitration();
    }
}
