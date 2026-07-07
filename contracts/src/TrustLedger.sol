// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time
// solhint-disable code-complexity
// solhint-disable ordering

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
import {IArbitration} from "./interfaces/IArbitration.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IReputationRegistry} from "./interfaces/IReputationRegistry.sol";

// TrustLedger is the core escrow contract. It holds ETH (or ERC-20 tokens) between
// a client and a freelancer and enforces a lifecycle of states that protect both parties:
//   Freelancer proposes → Client accepts & funds escrow → Freelancer submits work →
//   Client approves (or disputes) → Funds released (or arbitrated)
//
// New in Part 1:
//   - Proportional fee split: fee burden shared by completion percentage, not flat deduction.
//   - Bidirectional reputation: both parties rate each other post-completion via ReputationRegistry.
//   - Contract amendment: freelancer can cancel a PENDING proposal and re-propose with new terms.
//   - Accept-to-fund: the freelancer proposes unfunded terms; the client's funding tx is its consent.
//   - Stablecoin support: optional ERC-20 token escrow alongside native ETH.
//   - Chainlink price feed: ETH/USD rate locked at acceptance for informational USD tracking.
//
// `is ReentrancyGuard` mixes in OpenZeppelin's nonReentrant modifier so that
// functions sending ETH or tokens cannot be called recursively by a malicious contract.

/// @title TrustLedger
/// @author Kevin Le, Kellen Snider
/// @notice Decentralized escrow contract for freelance agreements on Ethereum.
///         Funds are released on client approval, acceptance-window expiry, or an arbitration ruling.
contract TrustLedger is ReentrancyGuard, Pausable {
    // ─── Types
    // ────────────────────────────────────────────────────────────────

    // An enum defines a finite set of named states. Under the hood Solidity stores
    // it as a uint8 (0, 1, 2 …). Using an enum instead of raw numbers makes the
    // code self-documenting and prevents typos.
    enum Status {
        PENDING, // 0 - Freelancer proposed terms; client hasn't funded/responded yet
        ACTIVE, // 1 - Client accepted and funded escrow; project deadline is counting down
        SUBMITTED, // 2 - Freelancer submitted proof-of-work; acceptance window running
        APPROVED, // 3 - Client approved OR acceptance window elapsed (auto-release)
        DISPUTED, // 4 - Client opened a dispute; awaiting arbitration
        RESOLVED, // 5 - Arbitration finalized and ruling executed
        CANCELLED // 6 - Freelancer rejected, client cancelled pending, or client reclaimed after deadline miss
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
    // Slot 10: address(20) - token address (12 bytes spare)
    // Slot 11: uint256 - USD value at creation from price feed
    // Slot 12: uint256 - previous contract ID (type(uint256).max = no predecessor)
    struct EscrowContract {
        // ── Slot 0 (27/32 bytes used)
        // ─────────────────────────────────────────
        address client; // who hired the freelancer; deposited the funds
        uint16 arbitrationFeeBps; // percentage of escrow kept as juror fee (basis points)
        uint16 holdBackBps; // percentage withheld until warranty expires (0 or 500-1500)
        Status status; // current lifecycle state (see enum above)
        bool proposedByClient; // true = client initiated; false = freelancer proposed (default)
        bool freelancerAccepted; // true once freelancer calls acceptContractByFreelancer; client must then fund

        // ── Slot 1 (28/32 bytes used)
        // ─────────────────────────────────────────
        address freelancer; // who does the work; receives payment
        uint64 warrantyDeadline; // set on approval: approval time + warrantyPeriod

        // ── Slot 2 (32/32 bytes used)
        // ─────────────────────────────────────────
        uint64 projectDeadline; // unix timestamp when the project is due
        uint64 acceptanceWindow; // how long the client has to review submitted work (≥ 48h)
        uint64 acceptanceDeadline; // set when proof is submitted: submission time + acceptanceWindow
        uint64 warrantyPeriod; // how long the warranty hold-back is locked

        // ── Slots 3-5
        // ─────────────────────────────────────────────────────────
        uint256 amount; // ETH (wei) or token units held in escrow
        uint256 holdBackAmount; // actual amount held back (computed from holdBackBps × amount)
        uint256 arbitrationId; // dispute ID in the Arbitration contract (set on dispute)

        // ── Slots 6-9 (dynamic)
        // ───────────────────────────────────────────────
        bytes32 contractHash; // keccak256 of the off-chain contract document
        string contractURI; // IPFS link to the full document
        bytes32 proofOfWorkHash; // keccak256 of the deliverable; set when freelancer submits
        string proofOfWorkURI; // IPFS link to the deliverable

        // ── Slot 10 (20/32 bytes used)
        // ────────────────────────────────────────
        address token; // ERC-20 token contract; address(0) = native ETH escrow

        // ── Slot 11
        // ───────────────────────────────────────────────────────────
        // ETH/USD at creation (8 Chainlink decimals); 0 if feed not set or ERC-20 escrow.
        uint256 usdValueAtCreation;

        // ── Slot 12
        // ───────────────────────────────────────────────────────────
        // Links this contract to a cancelled predecessor for amendment version history.
        // type(uint256).max = no predecessor (this is an original contract).
        uint256 previousContractId;
    }

    // ─── Constants
    // ────────────────────────────────────────────────────────────

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
    ///         A completionPct ≥ 80 means the freelancer clearly won - the dispute was frivolous.
    uint256 public constant FRIVOLOUS_DISPUTE_THRESHOLD = 80;

    /// @notice Ruling at or below this threshold triggers an automatic reputation penalty for the freelancer.
    ///         A completionPct ≤ 20 means the freelancer delivered clearly deficient work.
    uint256 public constant POOR_WORK_THRESHOLD = 20;

    // ─── State
    // ───────────────────────────────────────────────────────────────

    // `immutable` is set once in the constructor and can never be changed.
    // SCREAMING_SNAKE_CASE is required by the `immutable-vars-naming` solhint rule.

    /// @notice The Arbitration contract that receives fee pools and issues rulings.
    IArbitration public immutable ARBITRATION;

    /// @notice The address that deployed this contract. Only the deployer may wire in
    ///         the optional one-time modules (price feed, reputation registry, pauser),
    ///         preventing an attacker from front-running an unrestricted initializer and
    ///         permanently seizing a role after deployment.
    address public immutable DEPLOYER;

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

    /// @notice ERC-20 token addresses approved for use as escrow currency.
    ///         The zero address (native ETH) is always implicitly allowed.
    ///         Populated via addAllowedToken(); enforced at proposal time.
    mapping(address token => bool allowed) public allowedTokens;

    // Tracks which party has already submitted a rating for each contract.
    // Prevents rating the same counterparty twice.
    mapping(uint256 id => bool rated) private _clientRated;
    mapping(uint256 id => bool rated) private _freelancerRated;

    // ─── Events
    // ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a freelancer proposes a new (unfunded) escrow contract.
    /// @param id         Contract identifier.
    /// @param client     Address expected to review and fund the escrow on acceptance.
    /// @param freelancer Address that proposed the terms and will complete the work.
    /// @param amount     Funds the client will lock in escrow on acceptance (ETH wei or token units).
    event ContractProposed(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount);

    /// @notice Emitted when a client proposes an escrow contract (unfunded) awaiting freelancer acceptance.
    /// @param id         Contract identifier.
    /// @param client     Address that proposed the terms.
    /// @param freelancer Address expected to review, accept, and then wait for client funding.
    /// @param amount     Funds the client will lock once the freelancer accepts (ETH wei or token units).
    event ContractProposedByClient(
        uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount
    );

    /// @notice Emitted when the client funds a client-proposed escrow after the freelancer has accepted.
    ///         The escrow becomes ACTIVE and the project deadline timer starts.
    /// @param id Contract identifier.
    event ContractFundedByClient(uint256 indexed id);

    /// @notice Emitted when the client accepts the proposal and funds the escrow.
    /// @param id Contract identifier.
    event ContractAccepted(uint256 indexed id);

    /// @notice Emitted when the client rejects the freelancer's proposal.
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
    /// @param completionPct Juror-determined completion percentage (0-100).
    event RulingExecuted(uint256 indexed id, uint256 indexed completionPct);

    /// @notice Emitted when a party submits a rating for the other party.
    /// @param id    Contract identifier.
    /// @param rater The address that submitted the rating.
    /// @param score The rating score (1-100).
    event RatingSubmitted(uint256 indexed id, address indexed rater, uint8 indexed score);

    /// @notice Emitted when a new contract is linked as an amendment of a cancelled predecessor.
    /// @param newId      The replacement contract ID.
    /// @param previousId The cancelled contract ID being superseded.
    event ContractAmended(uint256 indexed newId, uint256 indexed previousId);

    /// @notice Emitted when an ERC-20 token is added to the escrow-currency allowlist.
    /// @param token ERC-20 contract address that was approved.
    event TokenAllowed(address indexed token);

    // ─── Errors
    // ──────────────────────────────────────────────────────────────

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

    /// @notice Client address is missing when a freelancer proposes terms.
    error InvalidClientAddress();

    /// @notice Freelancer address is missing when a client proposes terms.
    error InvalidFreelancerAddress();

    /// @notice Client address cannot be the caller when a freelancer proposes terms.
    error ClientIsCaller();

    /// @notice Freelancer address cannot be the caller when a client proposes terms.
    error FreelancerIsCaller();

    /// @notice Escrow amount is zero on a proposal.
    error ProposalAmountZero();

    /// @notice Estimated project duration is zero on a proposal.
    error InvalidEstimatedDuration();

    /// @notice Contract document hash is missing on a proposal.
    error ContractHashRequired();

    /// @notice Contract document URI is missing on a proposal.
    error ContractURIRequired();

    /// @notice Buffer factor is below the minimum of 1.1× (1100).
    error InvalidBufferFactor();

    /// @notice Acceptance window is below the minimum of 48 hours.
    error InvalidAcceptanceWindow();

    /// @notice Arbitration fee is zero or exceeds the 50% maximum.
    error InvalidArbitrationFee();

    /// @notice Hold-back BPS is outside the allowed range (0 or 500-1500).
    error InvalidHoldBack();

    /// @notice Hold-back and warranty period must both be set or both be zero.
    error InvalidWarrantyPeriod();

    /// @notice No funds were sent with the transaction.
    error InsufficientFunds();

    /// @notice A required address (client or freelancer) cannot be the zero address.
    error ZeroAddress();

    /// @notice The freelancer cannot propose a contract to themselves as the client.
    error SelfContract();

    /// @notice completionPct is greater than 100.
    error CompletionPctOutOfRange();

    /// @notice Low-level ETH transfer to the recipient failed.
    error EthTransferFailed();

    /// @notice ERC-20 token transfer returned false.
    error TokenTransferFailed();

    /// @notice Mismatch between token address and funding params (ETH vs token).
    error InvalidTokenParams();

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

    /// @notice Caller is not the deployer authorized to run one-time module setters.
    error NotDeployer();

    /// @notice contractHash or proofOfWorkHash must not be bytes32(0).
    error EmptyHash();

    /// @notice contractURI or proofOfWorkURI must not be an empty string.
    error EmptyURI();

    /// @notice The referenced previous contract is not CANCELLED, or the caller is not its client.
    error InvalidPreviousContract();

    /// @notice This action is only valid for freelancer-proposed (unfunded PENDING) contracts.
    error NotFreelancerProposed();

    /// @notice This action is only valid for client-proposed (pre-funded PENDING) contracts.
    error NotClientProposed();

    /// @notice Token address is not on the approved ERC-20 allowlist.
    error TokenNotAllowed();

    // ─── Constructor
    // ─────────────────────────────────────────────────────────

    /// @notice Deploys TrustLedger and binds it to an Arbitration contract.
    /// @param arbitration_ Address of the deployed Arbitration contract.
    constructor(address arbitration_) {
        if (arbitration_ == address(0)) {
            revert ZeroAddress();
        }
        ARBITRATION = IArbitration(arbitration_);
        // Capture the deployer so the optional module setters below can be gated to
        // it. This is a minimal access boundary — not a mutable owner/admin role — so
        // no ownership-transfer surface is introduced.
        DEPLOYER = msg.sender;
    }

    // ─── One-time setters
    // ─────────────────────────────────────────────────────
    // These allow optional modules to be wired in after deployment. Each address can
    // be set exactly once and only by the deployer, so an attacker cannot front-run an
    // unset initializer to seize a module role.

    // Reverts unless the caller is the deployer captured at construction.
    function _onlyDeployer() internal view {
        if (msg.sender != DEPLOYER) {
            revert NotDeployer();
        }
    }

    /// @notice Wire in the Chainlink ETH/USD price feed (optional).
    ///         Once set it cannot be changed. If never called, usdValueAtCreation = 0.
    /// @param feed_ Address of the AggregatorV3Interface price feed contract.
    function initPriceFeed(address feed_) external {
        _onlyDeployer();
        if (address(priceFeed) != address(0)) {
            revert AlreadySet();
        }
        if (feed_ == address(0)) {
            revert ZeroAddress();
        }
        priceFeed = AggregatorV3Interface(feed_);
    }

    /// @notice Wire in the ReputationRegistry (optional).
    ///         Once set it cannot be changed. If never called, submitRating() is a no-op.
    /// @param registry_ Address of the ReputationRegistry contract.
    function initReputationRegistry(address registry_) external {
        _onlyDeployer();
        if (address(reputationRegistry) != address(0)) {
            revert AlreadySet();
        }
        if (registry_ == address(0)) {
            revert ZeroAddress();
        }
        reputationRegistry = IReputationRegistry(registry_);
    }

    /// @notice Wire in the pauser address (optional).
    ///         Once set it cannot be changed. If never called, pause() and unpause() always revert.
    /// @param pauser_ Address authorized to pause and unpause new contract creation.
    function initPauser(address pauser_) external {
        _onlyDeployer();
        if (pauser != address(0)) {
            revert AlreadySet();
        }
        if (pauser_ == address(0)) {
            revert ZeroAddress();
        }
        pauser = pauser_;
    }

    /// @notice Pause proposeContract, blocking new escrows from being proposed.
    ///         All in-flight lifecycle functions (accept, submit, approve, dispute, claim) remain active
    ///         so that funds already in escrow can always exit.
    function pause() external {
        if (msg.sender != pauser) {
            revert NotPauser();
        }
        _pause();
    }

    /// @notice Unpause proposeContract, re-enabling new escrow proposals.
    function unpause() external {
        if (msg.sender != pauser) {
            revert NotPauser();
        }
        _unpause();
    }

    /// @notice Add an ERC-20 token to the escrow-currency allowlist.
    ///         Callable by the pauser once a pauser is configured; callable by anyone before initPauser.
    ///         Native ETH (address(0)) is always allowed and must not be passed here.
    ///         Adding a token is permanent — there is no removal function.
    /// @param token_ ERC-20 contract address to approve as a valid escrow currency.
    function addAllowedToken(address token_) external {
        if (pauser != address(0) && msg.sender != pauser) {
            revert NotPauser();
        }
        if (token_ == address(0)) {
            revert ZeroAddress();
        }
        allowedTokens[token_] = true;
        emit TokenAllowed(token_);
    }

    // ─── Freelancer: propose
    // ───────────────────────────────────────────────────────

    /// @notice Propose an escrow contract. The caller is the freelancer; no funds move
    ///         until the named client accepts via {acceptContract}. Emits {ContractProposed}.
    ///         For ETH escrow:    set token = address(0) and amount = the wei the client will lock.
    ///         For ERC-20 escrow: set token = token address and amount = the token units to lock.
    /// @param client            Address expected to review and fund the escrow.
    /// @param contractHash      keccak256 of the off-chain contract document.
    /// @param contractURI       IPFS URI pointing to the contract document.
    /// @param estimatedDuration How long the project should take, in seconds.
    /// @param bufferFactor      Deadline multiplier × 1000 (e.g. 1200 = 1.2×; minimum 1100).
    /// @param acceptanceWindow  Review period after submission, in seconds (≥ 48 h).
    /// @param arbitrationFeeBps Juror fee as basis points (e.g. 1000 = 10%; max 5000).
    /// @param holdBackBps       Warranty retention as basis points (0 = none; or 500-1500).
    /// @param warrantyPeriod    How long warranty hold-back is locked after approval, in seconds.
    /// @param token             ERC-20 token address; use address(0) for native ETH.
    /// @param amount            Escrow amount the client will lock on acceptance (wei or token units).
    /// @return id               The ID of the newly proposed escrow contract.
    function proposeContract(
        address client,
        bytes32 contractHash,
        string calldata contractURI,
        uint256 estimatedDuration,
        uint256 bufferFactor,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod,
        address token,
        uint256 amount
    )
        external
        whenNotPaused
        returns (uint256 id)
    {
        if (contractHash == bytes32(0)) {
            revert ContractHashRequired();
        }
        if (bytes(contractURI).length == 0) {
            revert ContractURIRequired();
        }
        if (token != address(0) && !allowedTokens[token]) {
            revert TokenNotAllowed();
        }
        _validateProposeParams({
            counterparty: client,
            counterpartyIsFreelancer: false,
            estimatedDuration: estimatedDuration,
            bufferFactor: bufferFactor,
            acceptanceWindow: acceptanceWindow,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: holdBackBps,
            warrantyPeriod: warrantyPeriod,
            amount: amount
        });

        id = nextId;
        ++nextId;

        // No funds are held while PENDING, so the project deadline cannot start counting
        // from proposal time (an arbitrary client delay would eat the freelancer's working
        // window). Store the buffered duration (seconds) in projectDeadline now; acceptContract
        // converts it to an absolute timestamp = block.timestamp + duration when the client funds.
        uint256 bufferedDuration = (estimatedDuration * bufferFactor) / 1000;

        _storeEscrow({
            id: id,
            client: client,
            freelancer_: msg.sender,
            contractHash: contractHash,
            contractURI: contractURI,
            deadline: bufferedDuration,
            acceptanceWindow: acceptanceWindow,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: holdBackBps,
            warrantyPeriod: warrantyPeriod,
            token: token,
            escrowAmount: amount,
            usdValue: 0, // computed at acceptance, when the ETH value is actually locked
            proposedByClient_: false
        });

        emit ContractProposed(id, client, msg.sender, amount);
    }

    // ─── Freelancer: withdraw proposal
    // ───────────────────────────────────────────────

    /// @notice Freelancer withdraws their own PENDING proposal before the client funds it.
    ///         No funds are held while PENDING, so nothing is transferred. Emits {ContractCancelled}.
    /// @param id The escrow contract ID.
    function cancelProposal(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) {
            revert Unauthorized();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }
        // Client-proposed contracts hold live funds; use withdrawClientProposal instead.
        if (c.proposedByClient) {
            revert NotFreelancerProposed();
        }

        c.status = Status.CANCELLED;
        emit ContractCancelled(id);
    }

    // ─── Freelancer: amendment linking
    // ────────────────────────────────────────────

    /// @notice Links a PENDING replacement proposal to its CANCELLED predecessor,
    ///         establishing an on-chain amendment version history. Emits {ContractAmended}.
    ///
    ///         Amendment flow:
    ///           1. Freelancer calls cancelProposal(oldId)  → oldId becomes CANCELLED.
    ///           2. Freelancer calls proposeContract(...)   → newId is PENDING.
    ///           3. Freelancer calls linkAmendment(newId, oldId) → on-chain link recorded.
    ///
    ///         Constraints:
    ///           - Caller must be the freelancer on both contracts.
    ///           - oldId must be CANCELLED; newId must be PENDING.
    ///           - newId must not already have a predecessor (each contract links to at most one).
    /// @param newId      The replacement contract ID.
    /// @param previousId the cancelled contract ID being superseded.
    function linkAmendment(uint256 newId, uint256 previousId) external {
        EscrowContract storage oldC = _contracts[previousId];
        EscrowContract storage newC = _contracts[newId];
        // The initiating party must match across both contracts.
        // Freelancer-proposed: freelancer is the initiator.
        // Client-proposed:     client is the initiator.
        address oldInitiator = oldC.proposedByClient ? oldC.client : oldC.freelancer;
        address newInitiator = newC.proposedByClient ? newC.client : newC.freelancer;
        if (msg.sender != oldInitiator) {
            revert InvalidPreviousContract();
        }
        if (msg.sender != newInitiator) {
            revert Unauthorized();
        }
        if (oldC.status != Status.CANCELLED) {
            revert InvalidPreviousContract();
        }
        if (newC.status != Status.PENDING) {
            revert InvalidStatus(newC.status);
        }
        if (newC.previousContractId != type(uint256).max) {
            revert AlreadySet();
        }

        newC.previousContractId = previousId;
        emit ContractAmended(newId, previousId);
    }

    // ─── Client: propose
    // ──────────────────────────────────────────────────────────────────

    /// @notice Client proposes an escrow contract (unfunded) for the freelancer to review.
    ///         No funds are locked at this stage. Once the freelancer calls {acceptContractByFreelancer}
    ///         the client must fund via {fundContractByClient} to activate the escrow.
    ///         Emits {ContractProposedByClient}.
    /// @param freelancer        Address expected to perform the work.
    /// @param contractHash      keccak256 of the off-chain contract document.
    /// @param contractURI       IPFS URI pointing to the contract document.
    /// @param estimatedDuration How long the project should take, in seconds.
    /// @param bufferFactor      Deadline multiplier × 1000 (e.g. 1200 = 1.2×; minimum 1100).
    /// @param acceptanceWindow  Review period after submission, in seconds (≥ 48 h).
    /// @param arbitrationFeeBps Juror fee as basis points (e.g. 1000 = 10%; max 5000).
    /// @param holdBackBps       Warranty retention as basis points (0 = none; or 500-1500).
    /// @param warrantyPeriod    How long warranty hold-back is locked after approval, in seconds.
    /// @param token             ERC-20 token address; use address(0) for native ETH.
    /// @param amount            Escrow amount the client agrees to lock upon freelancer acceptance.
    /// @return id               The ID of the newly proposed escrow contract.
    function proposeContractByClient(
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
        uint256 amount
    )
        external
        whenNotPaused
        returns (uint256 id)
    {
        if (contractHash == bytes32(0)) {
            revert ContractHashRequired();
        }
        if (bytes(contractURI).length == 0) {
            revert ContractURIRequired();
        }
        if (token != address(0) && !allowedTokens[token]) {
            revert TokenNotAllowed();
        }
        _validateProposeParams({
            counterparty: freelancer,
            counterpartyIsFreelancer: true,
            estimatedDuration: estimatedDuration,
            bufferFactor: bufferFactor,
            acceptanceWindow: acceptanceWindow,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: holdBackBps,
            warrantyPeriod: warrantyPeriod,
            amount: amount
        });

        id = nextId;
        ++nextId;

        uint256 bufferedDuration = (estimatedDuration * bufferFactor) / 1000;

        _storeEscrow({
            id: id,
            client: msg.sender,
            freelancer_: freelancer,
            contractHash: contractHash,
            contractURI: contractURI,
            deadline: bufferedDuration,
            acceptanceWindow: acceptanceWindow,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: holdBackBps,
            warrantyPeriod: warrantyPeriod,
            token: token,
            escrowAmount: amount,
            usdValue: 0,
            proposedByClient_: true
        });

        emit ContractProposedByClient(id, msg.sender, freelancer, amount);
    }

    // ─── Client: withdraw unfunded proposal
    // ──────────────────────────────────────

    /// @notice Client cancels their own PENDING proposal before it is funded (i.e. before or after
    ///         freelancer acceptance but before {fundContractByClient} is called).
    ///         No funds are held at this stage, so nothing is transferred. Emits {ContractCancelled}.
    /// @param id The escrow contract ID.
    function withdrawClientProposal(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (!c.proposedByClient) {
            revert NotClientProposed();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }

        c.status = Status.CANCELLED;
        emit ContractCancelled(id);
    }

    // ─── Freelancer: accept / reject client proposals
    // ────────────────────────────────

    /// @notice Freelancer signals agreement to a client-proposed contract. The contract remains
    ///         PENDING until the client calls {fundContractByClient} to lock the escrow funds
    ///         and start the project deadline. Emits {ContractAccepted}.
    /// @param id The escrow contract ID.
    function acceptContractByFreelancer(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) {
            revert Unauthorized();
        }
        if (!c.proposedByClient) {
            revert NotClientProposed();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }
        if (c.freelancerAccepted) {
            revert AlreadySet();
        }

        c.freelancerAccepted = true;
        emit ContractAccepted(id);
    }

    /// @notice Freelancer declines a client-proposed contract before accepting it.
    ///         No funds are held at this stage, so nothing is transferred. Emits {ContractRejected}.
    /// @param id The escrow contract ID.
    function rejectContractByFreelancer(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) {
            revert Unauthorized();
        }
        if (!c.proposedByClient) {
            revert NotClientProposed();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }
        // Cannot reject after already accepting; the client must withdraw instead.
        if (c.freelancerAccepted) {
            revert AlreadySet();
        }

        c.status = Status.CANCELLED;
        emit ContractRejected(id);
    }

    // ─── Client: fund after freelancer acceptance
    // ────────────────────────────────────────────

    /// @notice Client funds a client-proposed escrow after the freelancer has accepted.
    ///         This activates the contract and starts the project deadline.
    ///         For ETH escrow:    send msg.value == amount.
    ///         For ERC-20 escrow: send no ETH; pre-approve this contract for the proposed amount.
    ///         Emits {ContractFundedByClient}.
    /// @param id The escrow contract ID.
    function fundContractByClient(uint256 id) external payable nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (!c.proposedByClient) {
            revert NotClientProposed();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }
        if (!c.freelancerAccepted) {
            revert InvalidStatus(c.status); // freelancer has not yet accepted
        }

        // Validate the incoming payment without touching external contracts yet (Checks).
        if (c.token == address(0)) {
            if (msg.value != c.amount) {
                revert InsufficientFunds();
            }
        } else {
            if (msg.value != 0) {
                revert InvalidTokenParams();
            }
        }

        // Effects: update state before any external interaction (CEI pattern).
        // Convert the buffered duration stored in projectDeadline to an absolute timestamp.
        // forge-lint: disable-next-line(unsafe-typecast)
        c.projectDeadline = uint64(block.timestamp + uint256(c.projectDeadline));
        c.usdValueAtCreation = c.token == address(0) ? _queryUsdValue(msg.value) : 0;
        c.status = Status.ACTIVE;

        // Interaction: pull ERC-20 funds after state is finalised.
        // A revert here (false return or throw) unwinds the state changes above.
        // Store the actual balance delta so fee-on-transfer / rebasing tokens (which
        // under-deliver vs. the requested amount) cannot brick later payouts by leaving
        // the escrow holding fewer units than `c.amount` promises.
        if (c.token != address(0)) {
            uint256 balanceBefore = IERC20(c.token).balanceOf(address(this));
            bool ok = IERC20(c.token).transferFrom(msg.sender, address(this), c.amount);
            if (!ok) {
                revert TokenTransferFailed();
            }
            uint256 received = IERC20(c.token).balanceOf(address(this)) - balanceBefore;
            if (received == 0) {
                revert TokenTransferFailed();
            }
            if (received != c.amount) {
                c.amount = received;
            }
        }

        emit ContractFundedByClient(id);
    }

    // ─── Client: approve / dispute
    // ────────────────────────────────────────────

    /// @notice Client approves submitted work and releases funds. Emits {WorkApproved} and {FundsReleased}.
    /// @param id The escrow contract ID.
    function approveWork(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (c.status != Status.SUBMITTED) {
            revert InvalidStatus(c.status);
        }
        if (block.timestamp > c.acceptanceDeadline) {
            revert WindowElapsed();
        }

        c.status = Status.APPROVED;
        _releaseToFreelancer(id, c);

        emit WorkApproved(id);
    }

    /// @notice Client disputes submitted work, forwarding the fee pool to Arbitration. Emits {WorkDisputed}.
    /// @dev For ETH escrows: call with no msg.value (fee pool is deducted from held ETH).
    /// @dev For ERC-20 escrows: send ETH as msg.value to fund the juror fee pool.
    /// @param id The escrow contract ID.
    function disputeWork(uint256 id) external payable nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (c.status != Status.SUBMITTED) {
            revert InvalidStatus(c.status);
        }
        if (block.timestamp > c.acceptanceDeadline) {
            revert WindowElapsed();
        }

        uint256 feePool;
        if (c.token == address(0)) {
            // ETH escrow: fee pool is carved out of the held ETH.
            if (msg.value != 0) {
                revert InvalidTokenParams(); // no ETH should accompany ETH-escrow disputes
            }
            feePool = (c.amount * c.arbitrationFeeBps) / BPS_DENOMINATOR;
        } else {
            // ERC-20 escrow: client sends ETH separately to fund jurors.
            if (msg.value == 0) {
                revert InsufficientFunds();
            }
            feePool = msg.value;
        }

        c.status = Status.DISPUTED;

        // slither-disable-next-line reentrancy-eth
        uint256 arbId = ARBITRATION.openDispute{value: feePool}(id, c.client, c.freelancer, c.amount, feePool);
        c.arbitrationId = arbId;

        emit WorkDisputed(id, arbId);
    }

    // ─── Client: reclaim after deadline miss
    // ──────────────────────────────────

    /// @notice Client reclaims escrow after freelancer missed the project deadline. Emits {ContractCancelled}.
    /// @param id The escrow contract ID.
    function claimAfterDeadlineMiss(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (c.status != Status.ACTIVE) {
            revert InvalidStatus(c.status);
        }
        if (block.timestamp < uint256(c.projectDeadline) + 1) {
            revert DeadlineNotElapsed();
        }

        c.status = Status.CANCELLED;
        uint256 amount = c.amount;
        c.amount = 0;

        _sendFunds(c, c.client, amount);
        emit ContractCancelled(id);
    }

    // ─── Client: accept / reject
    // ──────────────────────────────────────────

    /// @notice Client accepts the freelancer's proposal and funds the escrow. Emits {ContractAccepted}.
    ///         The funding transaction itself is the client's consent — no separate signature is needed,
    ///         and the freelancer already proved authorship by sending {proposeContract}.
    ///         For ETH escrow:    send msg.value == the proposed amount.
    ///         For ERC-20 escrow: send no ETH; the client must have pre-approved this contract for the
    ///                            proposed amount, which is pulled via transferFrom.
    /// @param id The escrow contract ID.
    function acceptContract(uint256 id) external payable nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }
        // Client-proposed contracts are pre-funded; use acceptContractByFreelancer instead.
        if (c.proposedByClient) {
            revert NotFreelancerProposed();
        }

        // Validate the incoming payment without touching external contracts yet (Checks).
        if (c.token == address(0)) {
            if (msg.value != c.amount) {
                revert InsufficientFunds();
            }
        } else {
            if (msg.value != 0) {
                revert InvalidTokenParams(); // no ETH should accompany a token escrow
            }
        }

        // Effects: update state before any external interaction (CEI pattern).
        // The project deadline counts from acceptance. proposeContract stashed the buffered duration
        // (seconds) in projectDeadline; convert it to an absolute timestamp now that work can begin.
        // forge-lint: disable-next-line(unsafe-typecast)
        c.projectDeadline = uint64(block.timestamp + uint256(c.projectDeadline));
        c.usdValueAtCreation = c.token == address(0) ? _queryUsdValue(msg.value) : 0;
        c.status = Status.ACTIVE;

        // Interaction: pull ERC-20 funds after state is finalised.
        // A revert here (false return or throw) unwinds the state changes above.
        // Measure the actual balance delta rather than trusting `c.amount`: a
        // fee-on-transfer or rebasing token delivers fewer units than requested, and
        // storing the true received amount keeps every downstream payout solvent
        // instead of reverting once the escrow tries to send more than it holds.
        if (c.token != address(0)) {
            uint256 balanceBefore = IERC20(c.token).balanceOf(address(this));
            bool ok = IERC20(c.token).transferFrom(msg.sender, address(this), c.amount);
            if (!ok) {
                revert TokenTransferFailed();
            }
            uint256 received = IERC20(c.token).balanceOf(address(this)) - balanceBefore;
            if (received == 0) {
                revert TokenTransferFailed();
            }
            if (received != c.amount) {
                c.amount = received;
            }
        }

        emit ContractAccepted(id);
    }

    /// @notice Client rejects the freelancer's proposal. No funds are held while PENDING, so nothing
    ///         is transferred. Emits {ContractRejected}.
    /// @param id The escrow contract ID.
    function rejectContract(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) {
            revert Unauthorized();
        }
        if (c.status != Status.PENDING) {
            revert InvalidStatus(c.status);
        }
        // Client-proposed contracts hold live funds; use rejectContractByFreelancer instead.
        if (c.proposedByClient) {
            revert NotFreelancerProposed();
        }

        c.status = Status.CANCELLED;
        emit ContractRejected(id);
    }

    // ─── Freelancer: submit proof of work
    // ────────────────────────────────────

    /// @notice Freelancer submits proof of work, starting the acceptance window. Emits {ProofSubmitted}.
    /// @param id      The escrow contract ID.
    /// @param powHash keccak256 of the deliverable artifact.
    /// @param powURI  IPFS URI pointing to the deliverable.
    function submitProofOfWork(uint256 id, bytes32 powHash, string calldata powURI) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) {
            revert Unauthorized();
        }
        if (c.status != Status.ACTIVE) {
            revert InvalidStatus(c.status);
        }
        if (block.timestamp > c.projectDeadline) {
            revert DeadlineElapsed();
        }
        if (powHash == bytes32(0)) {
            revert EmptyHash();
        }
        if (bytes(powURI).length == 0) {
            revert EmptyURI();
        }

        c.proofOfWorkHash = powHash;
        c.proofOfWorkURI = powURI;
        c.acceptanceDeadline = uint64(block.timestamp + c.acceptanceWindow);
        c.status = Status.SUBMITTED;

        emit ProofSubmitted(id, powHash, powURI);
    }

    // ─── Freelancer: claim after acceptance window
    // ────────────────────────────

    /// @notice Freelancer claims payment after the acceptance window elapses.
    ///         Emits {WorkApproved} and {FundsReleased}.
    /// @param id The escrow contract ID.
    function claimAfterAcceptanceWindow(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) {
            revert Unauthorized();
        }
        if (c.status != Status.SUBMITTED) {
            revert InvalidStatus(c.status);
        }
        if (block.timestamp < uint256(c.acceptanceDeadline) + 1) {
            revert WindowNotElapsed();
        }

        c.status = Status.APPROVED;
        _releaseToFreelancer(id, c);

        emit WorkApproved(id);
    }

    // ─── Freelancer: claim warranty hold-back
    // ─────────────────────────────────

    /// @notice Freelancer claims the warranty hold-back after the warranty period expires.
    ///         Emits {WarrantyFundsClaimed}.
    /// @param id The escrow contract ID.
    function claimWarrantyFunds(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) {
            revert Unauthorized();
        }
        if (c.status != Status.APPROVED) {
            revert InvalidStatus(c.status);
        }
        if (c.holdBackAmount == 0) {
            revert InvalidHoldBack();
        }
        if (block.timestamp < uint256(c.warrantyDeadline) + 1) {
            revert WindowNotElapsed();
        }

        uint256 amount = c.holdBackAmount;
        c.holdBackAmount = 0;

        _sendFunds(c, c.freelancer, amount);
        emit WarrantyFundsClaimed(id, c.freelancer, amount);
    }

    // ─── Bidirectional rating
    // ─────────────────────────────────────────────────

    /// @notice Submit a rating for the counterparty after the contract finishes.
    ///         Clients rate freelancers; freelancers rate clients. Each may rate once.
    ///         Silently no-ops if ReputationRegistry has not been wired in. Emits {RatingSubmitted}.
    /// @param id    The escrow contract ID.
    /// @param score Rating in [1, 100] (1 = poor, 100 = excellent).
    function submitRating(uint256 id, uint8 score) external {
        if (address(reputationRegistry) == address(0)) {
            return; // registry not yet configured
        }

        EscrowContract storage c = _contracts[id];
        if (c.status != Status.APPROVED && c.status != Status.RESOLVED) {
            revert ContractNotFinished();
        }
        if (score == 0 || score > 100) {
            revert RatingOutOfRange();
        }

        if (msg.sender == c.client) {
            if (_clientRated[id]) {
                revert RatingAlreadySubmitted();
            }
            _clientRated[id] = true;
            reputationRegistry.rate(c.freelancer, score); // client rates freelancer
        } else if (msg.sender == c.freelancer) {
            if (_freelancerRated[id]) {
                revert RatingAlreadySubmitted();
            }
            _freelancerRated[id] = true;
            reputationRegistry.rate(c.client, score); // freelancer rates client
        } else {
            revert Unauthorized();
        }

        emit RatingSubmitted(id, msg.sender, score);
    }

    // ─── Arbitration callback
    // ─────────────────────────────────────────────────

    /// @notice Execute a juror ruling and distribute escrow funds. Called only by Arbitration.
    ///         Emits {RulingExecuted}.
    ///
    ///         Proportional fee split (new in Part 1):
    ///           The fee pool (paid to jurors) is shared proportionally by completion percentage.
    ///           Let pct be the completion fraction in [0,1] (e.g. 0.6 for 60%):
    ///             rawPay        = (2/3) × (pct × amount)   [freelancer gets 2/3 of earned amount]
    ///             freelancerPay = rawPay − (feePool × pct)  [minus their share of the fee]
    ///             clientRefund  = remaining − freelancerPay
    ///           A freelancer at 60% completion absorbs 60% of the fee; the client absorbs the other 40%.
    ///           Previously the fee was a flat deduction before splitting.
    ///
    ///         For ERC-20 escrows: feePool was paid in ETH at dispute time, so all token
    ///         units in `amount` are distributed between the parties (no token deduction).
    ///
    /// @param id            The escrow contract ID.
    /// @param completionPct Juror-determined completion percentage (0 = client wins, 100 = freelancer wins).
    function executeRuling(uint256 id, uint256 completionPct) external nonReentrant {
        if (msg.sender != address(ARBITRATION)) {
            revert Unauthorized();
        }
        if (completionPct > 100) {
            revert CompletionPctOutOfRange();
        }

        EscrowContract storage c = _contracts[id];
        if (c.status != Status.DISPUTED) {
            revert InvalidStatus(c.status);
        }

        c.status = Status.RESOLVED;

        // For ETH escrows, the fee pool was already forwarded to Arbitration at dispute time.
        // We recompute it here to know how much "remaining" is left for the parties.
        // For ERC-20 escrows, the fee was paid in ETH separately - all tokens are distributable.
        uint256 feePool = c.token == address(0) ? (c.amount * c.arbitrationFeeBps) / BPS_DENOMINATOR : 0;
        uint256 remaining = c.amount - feePool;

        uint256 freelancerPay;
        if (completionPct == 100) {
            freelancerPay = remaining; // full win for freelancer
        } else if (completionPct == 0) {
            freelancerPay = 0; // full win for client
        } else {
            // Proportional split: freelancer gets 2/3 of their earned amount (completionPct/100 × amount),
            // then pays their proportional share of the fee pool.
            // completionPct is 0-100, so dividing by 300 is equivalent to (2/3) × (completionPct/100 × amount).
            uint256 rawPay = (2 * completionPct * c.amount) / 300;
            uint256 freelancerFeeBurden = (feePool * completionPct) / 100;
            // Always non-negative: feePool ≤ 50% × amount < (2/3) × amount, so rawPay ≥ freelancerFeeBurden.
            freelancerPay = rawPay - freelancerFeeBurden;
            if (freelancerPay > remaining) {
                freelancerPay = remaining;
            }
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

    // ─── View
    // ─────────────────────────────────────────────────────────────────

    /// @notice Returns the full state of an escrow contract.
    /// @param id The escrow contract ID.
    /// @return result A memory copy of the EscrowContract struct.
    function getContract(uint256 id) external view returns (EscrowContract memory result) {
        return _contracts[id];
    }

    // ─── Internal
    // ─────────────────────────────────────────────────────────────

    // Validation helper shared by both proposal flows. `counterpartyIsFreelancer`
    // selects field-specific errors for the side that the caller is entering.
    function _validateProposeParams(
        address counterparty,
        bool counterpartyIsFreelancer,
        uint256 estimatedDuration,
        uint256 bufferFactor,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod,
        uint256 amount
    )
        internal
        view
    {
        if (counterparty == address(0)) {
            if (counterpartyIsFreelancer) {
                revert InvalidFreelancerAddress();
            }
            revert InvalidClientAddress();
        }
        if (counterparty == msg.sender) {
            if (counterpartyIsFreelancer) {
                revert FreelancerIsCaller();
            }
            revert ClientIsCaller();
        }
        if (amount == 0) {
            revert ProposalAmountZero();
        }
        if (estimatedDuration == 0) {
            revert InvalidEstimatedDuration();
        }
        if (bufferFactor < MIN_BUFFER_FACTOR) {
            revert InvalidBufferFactor();
        }
        if (acceptanceWindow < MIN_ACCEPTANCE_WINDOW) {
            revert InvalidAcceptanceWindow();
        }
        if (arbitrationFeeBps == 0 || arbitrationFeeBps > MAX_ARBITRATION_FEE_BPS) {
            revert InvalidArbitrationFee();
        }
        bool hbOutOfRange = holdBackBps < MIN_HOLD_BACK_BPS || holdBackBps > MAX_HOLD_BACK_BPS;
        if (holdBackBps != 0 && hbOutOfRange) {
            revert InvalidHoldBack();
        }
        if (holdBackBps != 0 && warrantyPeriod == 0) {
            revert InvalidWarrantyPeriod();
        }
        if (holdBackBps == 0 && warrantyPeriod != 0) {
            revert InvalidWarrantyPeriod();
        }
    }

    // Struct-initialisation helper shared by proposeContract and proposeContractByClient.
    function _storeEscrow(
        uint256 id,
        address client,
        address freelancer_,
        bytes32 contractHash,
        string calldata contractURI,
        uint256 deadline,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod,
        address token,
        uint256 escrowAmount,
        uint256 usdValue,
        bool proposedByClient_
    )
        internal
    {
        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 dl = uint64(deadline);
        // forge-lint: disable-next-line(unsafe-typecast)
        uint64 aw = uint64(acceptanceWindow);
        _contracts[id] = EscrowContract({
            client: client,
            freelancer: freelancer_,
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
            proposedByClient: proposedByClient_,
            freelancerAccepted: false,
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
            if (!ok) {
                revert EthTransferFailed();
            }
        } else {
            bool ok = IERC20(c.token).transfer(to, amount);
            if (!ok) {
                revert TokenTransferFailed();
            }
        }
    }

    // Queries the Chainlink ETH/USD price feed and returns the USD value of `ethAmount`.
    // Returns 0 if the feed is not configured or returns an invalid (≤ 0) price.
    // Result is in 8 decimal places (same as Chainlink USD feeds): $1 = 1e8.
    function _queryUsdValue(uint256 ethAmount) internal view returns (uint256 result) {
        if (address(priceFeed) == address(0)) {
            return 0;
        }
        // slither-disable-next-line unused-return
        (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
        // Reject stale or invalid prices (updatedAt == 0 means the round is not complete).
        if (price < 1 || updatedAt == 0) {
            return 0;
        }
        // ethAmount is in wei (1 ETH = 1e18). price is in 8 decimals. Dividing by 1e18 gives USD.
        // The `price < 1` guard above guarantees price is positive, so the int256->uint256 cast cannot wrap.
        // forge-lint: disable-next-line(unsafe-typecast)
        return (ethAmount * uint256(price)) / 1e18;
    }
}
