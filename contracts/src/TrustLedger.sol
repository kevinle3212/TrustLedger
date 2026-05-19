// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time
// solhint-disable code-complexity
// solhint-disable ordering

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IArbitration} from "./interfaces/IArbitration.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
import {IReputationRegistry} from "./interfaces/IReputationRegistry.sol";

// TrustLedger is the core escrow contract. It holds ETH (or ERC-20 tokens) between
// a client and a freelancer and enforces a lifecycle of states that protect both parties:
//   Client deposits → Freelancer accepts (with wallet signature) → Freelancer submits work →
//   Client approves (or disputes) → Funds released (or arbitrated)
//
// New in Part 1:
//   - Proportional fee split: fee burden shared by completion percentage, not flat deduction.
//   - Bidirectional reputation: both parties rate each other post-completion via ReputationRegistry.
//   - Contract amendment: client can cancel a PENDING contract and redeploy with new terms.
//   - Wallet binding: acceptContract requires an ECDSA signature proving key ownership.
//   - Stablecoin support: optional ERC-20 token escrow alongside native ETH.
//   - Chainlink price feed: ETH/USD rate locked at creation for informational USD tracking.
//
// `is ReentrancyGuard` mixes in OpenZeppelin's nonReentrant modifier so that
// functions sending ETH or tokens cannot be called recursively by a malicious contract.

/// @title TrustLedger
/// @author Kevin Le, Kellen Snider
/// @notice Decentralized escrow contract for freelance agreements on Ethereum.
///         Funds are released on client approval, acceptance-window expiry, or an arbitration ruling.
contract TrustLedger is ReentrancyGuard, Pausable {
    // ─── Types ────────────────────────────────────────────────────────────────

    // An enum defines a finite set of named states. Under the hood Solidity stores
    // it as a uint8 (0, 1, 2 …). Using an enum instead of raw numbers makes the
    // code self-documenting and prevents typos.
    enum Status {
        PENDING, // 0 — Contract created; freelancer hasn't responded yet
        ACTIVE, // 1 — Freelancer accepted; project deadline is counting down
        SUBMITTED, // 2 — Freelancer submitted proof-of-work; acceptance window running
        APPROVED, // 3 — Client approved OR acceptance window elapsed (auto-release)
        DISPUTED, // 4 — Client opened a dispute; awaiting arbitration
        RESOLVED, // 5 — Arbitration finalized and ruling executed
        CANCELLED // 6 — Freelancer rejected, client cancelled pending, or client reclaimed after deadline miss
    }

    // A struct is a custom composite type. Each EscrowContract lives in the _contracts
    // mapping and represents one freelance agreement with all its parameters.
    //
    // Fields are ordered to minimise EVM storage slots (32 bytes each).
    // Slot 0: address(20) + uint16(2) + uint16(2) + Status/uint8(1) = 25 bytes
    // Slot 1: address(20) + uint64(8)                               = 28 bytes
    // Slot 2: uint64(8) × 4                                         = 32 bytes
    // Slots 3-5: three uint256 fields                                = 96 bytes
    // Slots 6-9: two bytes32 + two dynamic strings
    // Slot 10: address(20) — token address (12 bytes spare)
    // Slot 11: uint256 — USD value at creation from price feed
    // Slot 12: uint256 — previous contract ID (type(uint256).max = no predecessor)
    struct EscrowContract {
        // ── Slot 0 (25/32 bytes used) ─────────────────────────────────────────
        address client; // who hired the freelancer; deposited the funds
        uint16 arbitrationFeeBps; // percentage of escrow kept as juror fee (basis points)
        uint16 holdBackBps; // percentage withheld until warranty expires (0 or 500–1500)
        Status status; // current lifecycle state (see enum above)

        // ── Slot 1 (28/32 bytes used) ─────────────────────────────────────────
        address freelancer; // who does the work; receives payment
        uint64 warrantyDeadline; // set on approval: approval time + warrantyPeriod

        // ── Slot 2 (32/32 bytes used) ─────────────────────────────────────────
        uint64 projectDeadline; // unix timestamp when the project is due
        uint64 acceptanceWindow; // how long the client has to review submitted work (≥ 48h)
        uint64 acceptanceDeadline; // set when proof is submitted: submission time + acceptanceWindow
        uint64 warrantyPeriod; // how long the warranty hold-back is locked

        // ── Slots 3-5 ─────────────────────────────────────────────────────────
        uint256 amount; // ETH (wei) or token units held in escrow
        uint256 holdBackAmount; // actual amount held back (computed from holdBackBps × amount)
        uint256 arbitrationId; // dispute ID in the Arbitration contract (set on dispute)

        // ── Slots 6-9 (dynamic) ───────────────────────────────────────────────
        bytes32 contractHash; // keccak256 of the off-chain contract document
        string contractURI; // IPFS link to the full document
        bytes32 proofOfWorkHash; // keccak256 of the deliverable; set when freelancer submits
        string proofOfWorkURI; // IPFS link to the deliverable

        // ── Slot 10 (20/32 bytes used) ────────────────────────────────────────
        address token; // ERC-20 token contract; address(0) = native ETH escrow

        // ── Slot 11 ───────────────────────────────────────────────────────────
        // ETH/USD at creation (8 Chainlink decimals); 0 if feed not set or ERC-20 escrow.
        uint256 usdValueAtCreation;

        // ── Slot 12 ───────────────────────────────────────────────────────────
        // Links this contract to a cancelled predecessor for amendment version history.
        // type(uint256).max = no predecessor (this is an original contract).
        uint256 previousContractId;
    }

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Minimum time the client has to review submitted work (48 hours).
    uint256 public constant MIN_ACCEPTANCE_WINDOW = 48 hours;

    /// @notice Minimum deadline buffer multiplier × 1000 applied to estimated duration (1.1×).
    uint256 public constant MIN_BUFFER_FACTOR = 1100;

    /// @notice Maximum arbitration fee in basis points (50%).
    uint256 public constant MAX_ARBITRATION_FEE_BPS = 5000;

    /// @notice Minimum warranty hold-back in basis points (5%).
    uint256 public constant MIN_HOLD_BACK_BPS = 500;

    /// @notice Maximum warranty hold-back in basis points (15%).
    uint256 public constant MAX_HOLD_BACK_BPS = 1500;

    /// @notice Denominator for basis-point arithmetic (10 000 bps = 100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Ruling at or above this threshold triggers an automatic reputation penalty for the client.
    ///         A completionPct ≥ 80 means the freelancer clearly won — the dispute was frivolous.
    uint256 public constant FRIVOLOUS_DISPUTE_THRESHOLD = 80;

    /// @notice Ruling at or below this threshold triggers an automatic reputation penalty for the freelancer.
    ///         A completionPct ≤ 20 means the freelancer delivered clearly deficient work.
    uint256 public constant POOR_WORK_THRESHOLD = 20;

    // ─── State ───────────────────────────────────────────────────────────────

    // `immutable` is set once in the constructor and can never be changed.
    // SCREAMING_SNAKE_CASE is required by the `immutable-vars-naming` solhint rule.

    /// @notice The Arbitration contract that receives fee pools and issues rulings.
    IArbitration public immutable ARBITRATION;

    /// @notice Auto-incrementing ID counter; the next contract created receives this ID.
    uint256 public nextId;

    // Maps contract id → EscrowContract struct.
    mapping(uint256 id => EscrowContract escrow) private _contracts;

    /// @notice Optional Chainlink ETH/USD price feed. Set once via initPriceFeed().
    ///         If not set (address(0)), usdValueAtCreation is stored as 0.
    AggregatorV3Interface public priceFeed;

    /// @notice Optional reputation registry. Set once via initReputationRegistry().
    ///         If not set, submitRating() silently no-ops.
    IReputationRegistry public reputationRegistry;

    /// @notice Address authorized to pause and unpause new contract creation.
    ///         Set once via initPauser(). If never called, pause() / unpause() revert.
    address public pauser;

    // Tracks which party has already submitted a rating for each contract.
    // Prevents rating the same counterparty twice.
    mapping(uint256 id => bool rated) private _clientRated;
    mapping(uint256 id => bool rated) private _freelancerRated;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new escrow contract is created.
    /// @param id         Contract identifier.
    /// @param client     Address that deposited funds.
    /// @param freelancer Address hired to complete the work.
    /// @param amount     Funds locked in escrow (ETH wei or token units).
    event ContractCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount);

    /// @notice Emitted when the freelancer accepts the contract.
    /// @param id Contract identifier.
    event ContractAccepted(uint256 indexed id);

    /// @notice Emitted when the freelancer rejects the contract.
    /// @param id Contract identifier.
    event ContractRejected(uint256 indexed id);

    /// @notice Emitted when the freelancer submits proof of work.
    /// @param id      Contract identifier.
    /// @param powHash keccak256 of the deliverable artifact.
    /// @param powURI  IPFS URI pointing to the deliverable.
    event ProofSubmitted(uint256 indexed id, bytes32 indexed powHash, string powURI);

    /// @notice Emitted when the client approves submitted work (or the window auto-expires).
    /// @param id Contract identifier.
    event WorkApproved(uint256 indexed id);

    /// @notice Emitted when the client opens a dispute.
    /// @param id            Contract identifier.
    /// @param arbitrationId Dispute ID in the Arbitration contract.
    event WorkDisputed(uint256 indexed id, uint256 indexed arbitrationId);

    /// @notice Emitted when funds are transferred out of escrow.
    /// @param id     Contract identifier.
    /// @param to     Recipient address.
    /// @param amount Amount transferred (ETH wei or token units).
    event FundsReleased(uint256 indexed id, address indexed to, uint256 indexed amount);

    /// @notice Emitted when the client reclaims funds or cancels a pending contract.
    /// @param id Contract identifier.
    event ContractCancelled(uint256 indexed id);

    /// @notice Emitted when the freelancer collects a warranty hold-back.
    /// @param id         Contract identifier.
    /// @param freelancer Recipient address.
    /// @param amount     Amount collected (ETH wei or token units).
    event WarrantyFundsClaimed(uint256 indexed id, address indexed freelancer, uint256 indexed amount);

    /// @notice Emitted when an arbitration ruling is executed and funds distributed.
    /// @param id            Contract identifier.
    /// @param completionPct Juror-determined completion percentage (0–100).
    event RulingExecuted(uint256 indexed id, uint256 indexed completionPct);

    /// @notice Emitted when a party submits a rating for the other party.
    /// @param id    Contract identifier.
    /// @param rater The address that submitted the rating.
    /// @param score The rating score (1–100).
    event RatingSubmitted(uint256 indexed id, address indexed rater, uint8 indexed score);

    /// @notice Emitted when a new contract is linked as an amendment of a cancelled predecessor.
    /// @param newId      The replacement contract ID.
    /// @param previousId The cancelled contract ID being superseded.
    event ContractAmended(uint256 indexed newId, uint256 indexed previousId);

    // ─── Errors ──────────────────────────────────────────────────────────────

    /// @notice Caller is not the expected party for this action.
    error Unauthorized();

    /// @notice The contract is not in the required state for this action.
    error InvalidStatus(Status current);

    /// @notice The project deadline has not yet elapsed.
    error DeadlineNotElapsed();

    /// @notice The project deadline has already elapsed.
    error DeadlineElapsed();

    /// @notice The acceptance or warranty window has not yet elapsed.
    error WindowNotElapsed();

    /// @notice The acceptance or warranty window has already closed.
    error WindowElapsed();

    /// @notice Buffer factor is below the minimum of 1.1× (1100).
    error InvalidBufferFactor();

    /// @notice Acceptance window is below the minimum of 48 hours.
    error InvalidAcceptanceWindow();

    /// @notice Arbitration fee is zero or exceeds the 50% maximum.
    error InvalidArbitrationFee();

    /// @notice Hold-back BPS is outside the allowed range (0 or 500–1500).
    error InvalidHoldBack();

    /// @notice Hold-back and warranty period must both be set or both be zero.
    error InvalidWarrantyPeriod();

    /// @notice No funds were sent with the transaction.
    error InsufficientFunds();

    /// @notice The freelancer address cannot be the zero address.
    error ZeroAddress();

    /// @notice The client cannot hire themselves.
    error SelfContract();

    /// @notice completionPct is greater than 100.
    error CompletionPctOutOfRange();

    /// @notice Low-level ETH transfer to the recipient failed.
    error EthTransferFailed();

    /// @notice ERC-20 token transfer returned false.
    error TokenTransferFailed();

    /// @notice Mismatch between token address and funding params (ETH vs token).
    error InvalidTokenParams();

    /// @notice ECDSA signature does not recover to the expected freelancer address.
    error InvalidSignature();

    /// @notice Rating score must be between 1 and 100 inclusive.
    error RatingOutOfRange();

    /// @notice This party has already submitted a rating for this contract.
    error RatingAlreadySubmitted();

    /// @notice Can only rate after the contract reaches APPROVED or RESOLVED.
    error ContractNotFinished();

    /// @notice One-time setter has already been called; the address cannot change.
    error AlreadySet();

    /// @notice Caller is not the designated pauser.
    error NotPauser();

    /// @notice contractHash or proofOfWorkHash must not be bytes32(0).
    error EmptyHash();

    /// @notice contractURI or proofOfWorkURI must not be an empty string.
    error EmptyURI();

    /// @notice The referenced previous contract is not CANCELLED, or the caller is not its client.
    error InvalidPreviousContract();

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Deploys TrustLedger and binds it to an Arbitration contract.
    /// @param arbitration_ Address of the deployed Arbitration contract.
    constructor(address arbitration_) {
        if (arbitration_ == address(0)) revert ZeroAddress();
        ARBITRATION = IArbitration(arbitration_);
    }

    // ─── One-time setters ─────────────────────────────────────────────────────
    // These allow optional modules to be wired in after deployment without
    // introducing an owner/admin role. Each address can be set exactly once.

    /// @notice Wire in the Chainlink ETH/USD price feed (optional).
    ///         Once set it cannot be changed. If never called, usdValueAtCreation = 0.
    /// @param feed_ Address of the AggregatorV3Interface price feed contract.
    function initPriceFeed(address feed_) external {
        if (address(priceFeed) != address(0)) revert AlreadySet();
        if (feed_ == address(0)) revert ZeroAddress();
        priceFeed = AggregatorV3Interface(feed_);
    }

    /// @notice Wire in the ReputationRegistry (optional).
    ///         Once set it cannot be changed. If never called, submitRating() is a no-op.
    /// @param registry_ Address of the ReputationRegistry contract.
    function initReputationRegistry(address registry_) external {
        if (address(reputationRegistry) != address(0)) revert AlreadySet();
        if (registry_ == address(0)) revert ZeroAddress();
        reputationRegistry = IReputationRegistry(registry_);
    }

    /// @notice Wire in the pauser address (optional).
    ///         Once set it cannot be changed. If never called, pause() and unpause() always revert.
    /// @param pauser_ Address authorized to pause and unpause new contract creation.
    function initPauser(address pauser_) external {
        if (pauser != address(0)) revert AlreadySet();
        if (pauser_ == address(0)) revert ZeroAddress();
        pauser = pauser_;
    }

    /// @notice Pause createContract, blocking new escrows from being opened.
    ///         All in-flight lifecycle functions (accept, submit, approve, dispute, claim) remain active
    ///         so that funds already in escrow can always exit.
    function pause() external {
        if (msg.sender != pauser) revert NotPauser();
        _pause();
    }

    /// @notice Unpause createContract, re-enabling new escrow creation.
    function unpause() external {
        if (msg.sender != pauser) revert NotPauser();
        _unpause();
    }

    // ─── Client: create ───────────────────────────────────────────────────────

    /// @notice Create an escrow contract and lock funds. Emits {ContractCreated}.
    ///         For ETH escrow: set token = address(0), tokenAmount = 0, and send ETH as msg.value.
    ///         For ERC-20 escrow: set token = token address, tokenAmount = amount, msg.value = 0.
    ///         The client must have pre-approved this contract for tokenAmount before calling.
    /// @param freelancer        Address of the hired freelancer.
    /// @param contractHash      keccak256 of the off-chain contract document.
    /// @param contractURI       IPFS URI pointing to the contract document.
    /// @param estimatedDuration How long the project should take, in seconds.
    /// @param bufferFactor      Deadline multiplier × 1000 (e.g. 1200 = 1.2×; minimum 1100).
    /// @param acceptanceWindow  Review period after submission, in seconds (≥ 48 h).
    /// @param arbitrationFeeBps Juror fee as basis points (e.g. 1000 = 10%; max 5000).
    /// @param holdBackBps       Warranty retention as basis points (0 = none; or 500–1500).
    /// @param warrantyPeriod    How long warranty hold-back is locked after approval, in seconds.
    /// @param token             ERC-20 token address; use address(0) for native ETH.
    /// @param tokenAmount       Token units to escrow; must be 0 for ETH escrows.
    /// @return id               The ID of the newly created escrow contract.
    function createContract(
        address freelancer,
        bytes32 contractHash,
        string calldata contractURI,
        uint256 estimatedDuration,
        uint256 bufferFactor,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod,
        address token,
        uint256 tokenAmount
    ) external payable whenNotPaused returns (uint256 id) {
        if (contractHash == bytes32(0)) revert EmptyHash();
        if (bytes(contractURI).length == 0) revert EmptyURI();
        _validateCreateParams(
            freelancer,
            bufferFactor,
            acceptanceWindow,
            arbitrationFeeBps,
            holdBackBps,
            warrantyPeriod,
            token,
            tokenAmount
        );

        id = nextId;
        ++nextId;

        uint256 escrowAmount = token == address(0) ? msg.value : tokenAmount;
        uint256 deadline = block.timestamp + (estimatedDuration * bufferFactor) / 1000;
        uint256 usdValue = token == address(0) ? _queryUsdValue(msg.value) : 0;

        _storeEscrow(
            id,
            freelancer,
            contractHash,
            contractURI,
            deadline,
            acceptanceWindow,
            arbitrationFeeBps,
            holdBackBps,
            warrantyPeriod,
            token,
            escrowAmount,
            usdValue
        );

        if (token != address(0)) {
            bool ok = IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
            if (!ok) revert TokenTransferFailed();
        }

        emit ContractCreated(id, msg.sender, freelancer, escrowAmount);
    }

    // ─── Client: cancel pending ───────────────────────────────────────────────

    /// @notice Client cancels a PENDING contract before the freelancer responds.
    ///         Returns all escrowed funds to the client. Emits {ContractCancelled}.
    /// @param id The escrow contract ID.
    function cancelPending(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.PENDING) revert InvalidStatus(c.status);

        c.status = Status.CANCELLED;

        // Zero out amount before sending — checks-effects-interactions pattern.
        uint256 amount = c.amount;
        c.amount = 0;

        _sendFunds(c, c.client, amount);
        emit ContractCancelled(id);
    }

    // ─── Client: amendment linking ────────────────────────────────────────────

    /// @notice Links a PENDING replacement contract to its CANCELLED predecessor,
    ///         establishing an on-chain amendment version history. Emits {ContractAmended}.
    ///
    ///         Amendment flow:
    ///           1. Client calls cancelPending(oldId)  → oldId becomes CANCELLED.
    ///           2. Client calls createContract(...)   → newId is PENDING.
    ///           3. Client calls linkAmendment(newId, oldId) → on-chain link recorded.
    ///
    ///         Constraints:
    ///           - Caller must be the client on both contracts.
    ///           - oldId must be CANCELLED; newId must be PENDING.
    ///           - newId must not already have a predecessor (each contract links to at most one).
    /// @param newId      The replacement contract ID.
    /// @param previousId The cancelled contract ID being superseded.
    function linkAmendment(uint256 newId, uint256 previousId) external {
        EscrowContract storage oldC = _contracts[previousId];
        EscrowContract storage newC = _contracts[newId];
        if (msg.sender != oldC.client) revert InvalidPreviousContract();
        if (msg.sender != newC.client) revert Unauthorized();
        if (oldC.status != Status.CANCELLED) revert InvalidPreviousContract();
        if (newC.status != Status.PENDING) revert InvalidStatus(newC.status);
        if (newC.previousContractId != type(uint256).max) revert AlreadySet();

        newC.previousContractId = previousId;
        emit ContractAmended(newId, previousId);
    }

    // ─── Client: approve / dispute ────────────────────────────────────────────

    /// @notice Client approves submitted work and releases funds. Emits {WorkApproved} and {FundsReleased}.
    /// @param id The escrow contract ID.
    function approveWork(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.SUBMITTED) revert InvalidStatus(c.status);
        if (block.timestamp > c.acceptanceDeadline) revert WindowElapsed();

        c.status = Status.APPROVED;
        _releaseToFreelancer(id, c);

        emit WorkApproved(id);
    }

    /// @notice Client disputes submitted work, forwarding the fee pool to Arbitration. Emits {WorkDisputed}.
    ///         For ETH escrows: call with no msg.value (fee pool is deducted from held ETH).
    ///         For ERC-20 escrows: send ETH as msg.value to fund the juror fee pool.
    /// @param id The escrow contract ID.
    // slither-disable-next-line reentrancy-eth
    function disputeWork(uint256 id) external payable nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.SUBMITTED) revert InvalidStatus(c.status);
        if (block.timestamp > c.acceptanceDeadline) revert WindowElapsed();

        uint256 feePool;
        if (c.token == address(0)) {
            // ETH escrow: fee pool is carved out of the held ETH.
            if (msg.value != 0) revert InvalidTokenParams(); // no ETH should accompany ETH-escrow disputes
            feePool = (c.amount * c.arbitrationFeeBps) / BPS_DENOMINATOR;
        } else {
            // ERC-20 escrow: client sends ETH separately to fund jurors.
            if (msg.value == 0) revert InsufficientFunds();
            feePool = msg.value;
        }

        c.status = Status.DISPUTED;

        uint256 arbId = ARBITRATION.openDispute{value: feePool}(id, c.client, c.freelancer, c.amount, feePool);
        c.arbitrationId = arbId;

        emit WorkDisputed(id, arbId);
    }

    // ─── Client: reclaim after deadline miss ──────────────────────────────────

    /// @notice Client reclaims escrow after freelancer missed the project deadline. Emits {ContractCancelled}.
    /// @param id The escrow contract ID.
    function claimAfterDeadlineMiss(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.ACTIVE) revert InvalidStatus(c.status);
        if (block.timestamp < uint256(c.projectDeadline) + 1) revert DeadlineNotElapsed();

        c.status = Status.CANCELLED;
        uint256 amount = c.amount;
        c.amount = 0;

        _sendFunds(c, c.client, amount);
        emit ContractCancelled(id);
    }

    // ─── Freelancer: accept / reject ──────────────────────────────────────────

    /// @notice Freelancer accepts the contract by providing a wallet signature. Emits {ContractAccepted}.
    ///         The signature must be: eth_sign(keccak256(abi.encodePacked(id, freelancerAddress))).
    ///         This proves the freelancer controls the private key for the address on the contract.
    /// @param id The escrow contract ID.
    /// @param v  Signature recovery byte (27 or 28).
    /// @param r  Signature r component.
    /// @param s  Signature s component.
    function acceptContract(uint256 id, uint8 v, bytes32 r, bytes32 s) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.PENDING) revert InvalidStatus(c.status);
        if (block.timestamp > c.projectDeadline) revert DeadlineElapsed();

        // Reconstruct the message the freelancer should have signed.
        // innerHash binds the signature to this specific contract ID and freelancer address,
        // preventing replay across different contracts or different wallets.
        bytes32 innerHash = keccak256(abi.encodePacked(id, c.freelancer));

        // EIP-191 prefix makes this compatible with eth_sign / personal_sign in wallets.
        // The "\x19Ethereum Signed Message:\n32" prefix prevents signed data from being
        // misused as a raw transaction.
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash));

        // ecrecover returns the address of the private key holder who signed ethSignedHash.
        // If the sig is invalid, ecrecover returns address(0).
        address signer = ecrecover(ethSignedHash, v, r, s);
        if (signer != c.freelancer) revert InvalidSignature();

        c.status = Status.ACTIVE;
        emit ContractAccepted(id);
    }

    /// @notice Freelancer rejects the contract and returns funds to the client. Emits {ContractRejected}.
    /// @param id The escrow contract ID.
    function rejectContract(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.PENDING) revert InvalidStatus(c.status);

        c.status = Status.CANCELLED;
        uint256 amount = c.amount;
        c.amount = 0;

        _sendFunds(c, c.client, amount);
        emit ContractRejected(id);
    }

    // ─── Freelancer: submit proof of work ────────────────────────────────────

    /// @notice Freelancer submits proof of work, starting the acceptance window. Emits {ProofSubmitted}.
    /// @param id      The escrow contract ID.
    /// @param powHash keccak256 of the deliverable artifact.
    /// @param powURI  IPFS URI pointing to the deliverable.
    function submitProofOfWork(uint256 id, bytes32 powHash, string calldata powURI) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.ACTIVE) revert InvalidStatus(c.status);
        if (block.timestamp > c.projectDeadline) revert DeadlineElapsed();
        if (powHash == bytes32(0)) revert EmptyHash();
        if (bytes(powURI).length == 0) revert EmptyURI();

        c.proofOfWorkHash = powHash;
        c.proofOfWorkURI = powURI;
        c.acceptanceDeadline = uint64(block.timestamp + c.acceptanceWindow);
        c.status = Status.SUBMITTED;

        emit ProofSubmitted(id, powHash, powURI);
    }

    // ─── Freelancer: claim after acceptance window ────────────────────────────

    /// @notice Freelancer claims payment after the acceptance window elapses.
    ///         Emits {WorkApproved} and {FundsReleased}.
    /// @param id The escrow contract ID.
    function claimAfterAcceptanceWindow(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.SUBMITTED) revert InvalidStatus(c.status);
        if (block.timestamp < uint256(c.acceptanceDeadline) + 1) revert WindowNotElapsed();

        c.status = Status.APPROVED;
        _releaseToFreelancer(id, c);

        emit WorkApproved(id);
    }

    // ─── Freelancer: claim warranty hold-back ─────────────────────────────────

    /// @notice Freelancer claims the warranty hold-back after the warranty period expires.
    ///         Emits {WarrantyFundsClaimed}.
    /// @param id The escrow contract ID.
    function claimWarrantyFunds(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.APPROVED) revert InvalidStatus(c.status);
        if (c.holdBackAmount == 0) revert InvalidHoldBack();
        if (block.timestamp < uint256(c.warrantyDeadline) + 1) revert WindowNotElapsed();

        uint256 amount = c.holdBackAmount;
        c.holdBackAmount = 0;

        _sendFunds(c, c.freelancer, amount);
        emit WarrantyFundsClaimed(id, c.freelancer, amount);
    }

    // ─── Bidirectional rating ─────────────────────────────────────────────────

    /// @notice Submit a rating for the counterparty after the contract finishes.
    ///         Clients rate freelancers; freelancers rate clients. Each may rate once.
    ///         Silently no-ops if ReputationRegistry has not been wired in. Emits {RatingSubmitted}.
    /// @param id    The escrow contract ID.
    /// @param score Rating in [1, 100] (1 = poor, 100 = excellent).
    function submitRating(uint256 id, uint8 score) external {
        if (address(reputationRegistry) == address(0)) return; // registry not yet configured

        EscrowContract storage c = _contracts[id];
        if (c.status != Status.APPROVED && c.status != Status.RESOLVED) revert ContractNotFinished();
        if (score == 0 || score > 100) revert RatingOutOfRange();

        if (msg.sender == c.client) {
            if (_clientRated[id]) revert RatingAlreadySubmitted();
            _clientRated[id] = true;
            reputationRegistry.rate(c.freelancer, score); // client rates freelancer
        } else if (msg.sender == c.freelancer) {
            if (_freelancerRated[id]) revert RatingAlreadySubmitted();
            _freelancerRated[id] = true;
            reputationRegistry.rate(c.client, score); // freelancer rates client
        } else {
            revert Unauthorized();
        }

        emit RatingSubmitted(id, msg.sender, score);
    }

    // ─── Arbitration callback ─────────────────────────────────────────────────

    /// @notice Execute a juror ruling and distribute escrow funds. Called only by Arbitration.
    ///         Emits {RulingExecuted}.
    ///
    ///         Proportional fee split (new in Part 1):
    ///           The fee pool (paid to jurors) is shared proportionally by completion percentage.
    ///           freelancerPay = ((2 × pct × amount) / 300) − (feePool × pct / 100)
    ///           clientRefund  = remaining − freelancerPay
    ///           This means a freelancer at 60% completion absorbs 60% of the fee; the client
    ///           absorbs the other 40%. Previously the fee was a flat deduction before splitting.
    ///
    ///         For ERC-20 escrows: feePool was paid in ETH at dispute time, so all token
    ///         units in `amount` are distributed between the parties (no token deduction).
    ///
    /// @param id            The escrow contract ID.
    /// @param completionPct Juror-determined completion percentage (0 = client wins, 100 = freelancer wins).
    function executeRuling(uint256 id, uint256 completionPct) external nonReentrant {
        if (msg.sender != address(ARBITRATION)) revert Unauthorized();
        if (completionPct > 100) revert CompletionPctOutOfRange();

        EscrowContract storage c = _contracts[id];
        if (c.status != Status.DISPUTED) revert InvalidStatus(c.status);

        c.status = Status.RESOLVED;

        // For ETH escrows, the fee pool was already forwarded to Arbitration at dispute time.
        // We recompute it here to know how much "remaining" is left for the parties.
        // For ERC-20 escrows, the fee was paid in ETH separately — all tokens are distributable.
        uint256 feePool = c.token == address(0) ? (c.amount * c.arbitrationFeeBps) / BPS_DENOMINATOR : 0;
        uint256 remaining = c.amount - feePool;

        uint256 freelancerPay;
        if (completionPct == 100) {
            freelancerPay = remaining; // full win for freelancer
        } else if (completionPct == 0) {
            freelancerPay = 0; // full win for client
        } else {
            // Proportional split: freelancer absorbs their share of the fee burden.
            // rawPay is the freelancer's gross share before the fee adjustment.
            // freelancerFeeBurden is the portion of feePool attributable to the freelancer's
            // completion claim (e.g. 60% completion → freelancer bears 60% of the fee).
            uint256 rawPay = (2 * completionPct * c.amount) / 300;
            uint256 freelancerFeeBurden = (feePool * completionPct) / 100;
            // Always non-negative: feePool ≤ 50% × amount, so 2/300 × amount ≥ feePool/100.
            freelancerPay = rawPay - freelancerFeeBurden;
            if (freelancerPay > remaining) freelancerPay = remaining;
        }

        uint256 clientRefund = remaining - freelancerPay;

        if (freelancerPay > 0) {
            _sendFunds(c, c.freelancer, freelancerPay);
            emit FundsReleased(id, c.freelancer, freelancerPay);
        }
        if (clientRefund > 0) {
            _sendFunds(c, c.client, clientRefund);
            emit FundsReleased(id, c.client, clientRefund);
        }

        emit RulingExecuted(id, completionPct);

        // Automatically record a reputation penalty for the party whose conduct was clearly at fault.
        // Setting the rated flag prevents the same party from also calling submitRating() for this contract.
        if (address(reputationRegistry) != address(0)) {
            if (completionPct > FRIVOLOUS_DISPUTE_THRESHOLD - 1) {
                _clientRated[id] = true;
                reputationRegistry.rate(c.client, 1);
            } else if (completionPct < POOR_WORK_THRESHOLD + 1) {
                _freelancerRated[id] = true;
                reputationRegistry.rate(c.freelancer, 1);
            }
        }
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    /// @notice Returns the full state of an escrow contract.
    /// @param id The escrow contract ID.
    /// @return   A memory copy of the EscrowContract struct.
    function getContract(uint256 id) external view returns (EscrowContract memory) {
        return _contracts[id];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    // Validation helper extracted from createContract to keep the function under the line limit.
    function _validateCreateParams(
        address freelancer,
        uint256 bufferFactor,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod,
        address token,
        uint256 tokenAmount
    ) internal view {
        if (freelancer == address(0)) revert ZeroAddress();
        if (freelancer == msg.sender) revert SelfContract();
        if (bufferFactor < MIN_BUFFER_FACTOR) revert InvalidBufferFactor();
        if (acceptanceWindow < MIN_ACCEPTANCE_WINDOW) revert InvalidAcceptanceWindow();
        if (arbitrationFeeBps == 0 || arbitrationFeeBps > MAX_ARBITRATION_FEE_BPS) revert InvalidArbitrationFee();
        bool hbOutOfRange = holdBackBps < MIN_HOLD_BACK_BPS || holdBackBps > MAX_HOLD_BACK_BPS;
        if (holdBackBps != 0 && hbOutOfRange) revert InvalidHoldBack();
        if (holdBackBps != 0 && warrantyPeriod == 0) revert InvalidWarrantyPeriod();
        if (holdBackBps == 0 && warrantyPeriod != 0) revert InvalidWarrantyPeriod();
        // Exactly one of ETH or ERC-20 must be funded; the other must be zero.
        if (token == address(0)) {
            if (msg.value == 0) revert InsufficientFunds(); // ETH escrow needs ETH
            if (tokenAmount != 0) revert InvalidTokenParams(); // must not specify token amount for ETH escrow
        } else {
            if (msg.value != 0) revert InvalidTokenParams(); // must not send ETH for token escrow
            if (tokenAmount == 0) revert InsufficientFunds(); // token escrow needs tokens
        }
    }

    // Struct-initialisation helper extracted from createContract to keep the function under the line limit.
    function _storeEscrow(
        uint256 id,
        address freelancer,
        bytes32 contractHash,
        string calldata contractURI,
        uint256 deadline,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod,
        address token,
        uint256 escrowAmount,
        uint256 usdValue
    ) internal {
        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 dl = uint64(deadline);
        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 aw = uint64(acceptanceWindow);
        _contracts[id] = EscrowContract({
            client: msg.sender,
            freelancer: freelancer,
            contractHash: contractHash,
            contractURI: contractURI,
            projectDeadline: dl,
            acceptanceWindow: aw,
            acceptanceDeadline: 0,
            warrantyPeriod: warrantyPeriod,
            warrantyDeadline: 0,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: holdBackBps,
            status: Status.PENDING,
            amount: escrowAmount,
            holdBackAmount: 0,
            arbitrationId: 0,
            proofOfWorkHash: bytes32(0),
            proofOfWorkURI: "",
            token: token,
            usdValueAtCreation: usdValue,
            previousContractId: type(uint256).max
        });
    }

    // Shared payout logic for approveWork and claimAfterAcceptanceWindow.
    // Computes the hold-back (if any), sends the freelancer's immediate payout,
    // and records the hold-back amount + warranty deadline for later claiming.
    function _releaseToFreelancer(uint256 id, EscrowContract storage c) internal {
        uint256 holdBack = (c.amount * c.holdBackBps) / BPS_DENOMINATOR;
        uint256 payout = c.amount - holdBack;

        if (holdBack > 0) {
            c.holdBackAmount = holdBack;
            c.warrantyDeadline = uint64(block.timestamp + c.warrantyPeriod);
        }

        if (payout > 0) {
            _sendFunds(c, c.freelancer, payout);
            emit FundsReleased(id, c.freelancer, payout);
        }
    }

    // Unified fund transfer helper.
    // For ETH escrows (token == address(0)): sends ETH via low-level call.
    // For ERC-20 escrows: calls IERC20.transfer on the token contract.
    // `call` is preferred over `transfer` because `transfer` forwards only 2300 gas,
    // which can fail for smart-contract wallets that need more gas in receive().
    function _sendFunds(EscrowContract storage c, address to, uint256 amount) internal {
        if (c.token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert EthTransferFailed();
        } else {
            bool ok = IERC20(c.token).transfer(to, amount);
            if (!ok) revert TokenTransferFailed();
        }
    }

    // Queries the Chainlink ETH/USD price feed and returns the USD value of `ethAmount`.
    // Returns 0 if the feed is not configured or returns an invalid (≤ 0) price.
    // Result is in 8 decimal places (same as Chainlink USD feeds): $1 = 1e8.
    function _queryUsdValue(uint256 ethAmount) internal view returns (uint256) {
        if (address(priceFeed) == address(0)) return 0;
        // slither-disable-next-line unused-return
        (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
        // Reject stale or invalid prices (updatedAt == 0 means the round is not complete).
        if (price < 1 || updatedAt == 0) return 0;
        // ethAmount is in wei (1 ETH = 1e18). price is in 8 decimals. Dividing by 1e18 gives USD.
        return (ethAmount * uint256(price)) / 1e18;
    }
}
