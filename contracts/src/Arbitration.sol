// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time
// solhint-disable code-complexity

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IArbitration} from "./interfaces/IArbitration.sol";
import {ITrustLedger} from "./interfaces/ITrustLedger.sol";
import {IJurorRegistry} from "./interfaces/IJurorRegistry.sol";
import {IVRFCoordinator} from "./interfaces/IVRFCoordinator.sol";

// Arbitration manages the commit-reveal voting process for disputed escrow contracts.
//
// High-level flow:
//   1. TrustLedger calls openDispute() → a Dispute is created in COMMIT phase.
//   2. Eligible jurors call commitVote(commitment) — they don't reveal their vote yet.
//      The commitment is keccak256(disputeId, jurorAddress, completionPct, salt).
//   3. Anyone calls advanceToReveal() once the commit window closes or slots fill up.
//   4. Jurors call revealVote(completionPct, salt) — re-derived hash must match commitment.
//   5. Anyone calls finalizeDispute() after the reveal window closes.
//      Median ruling is computed; minority voters are slashed.
//   6. Anyone calls executeRuling() after the appeal window closes (if no appeal).
//      TrustLedger.executeRuling() distributes ETH based on the ruling.
//
// `is IArbitration` means this contract must implement openDispute().
// `is ReentrancyGuard` adds the nonReentrant modifier for ETH-sending functions.

/// @title Arbitration
/// @author Kevin Le, Kellen Snider
/// @notice Commit-reveal juror voting system for TrustLedger disputes.
///         Jurors stake ETH, vote on completion percentage, and earn fees for majority votes.
contract Arbitration is IArbitration, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    // The phase enum tracks which step of the voting process a dispute is in.
    // COMMIT / REVEAL are for original disputes; APPEAL_COMMIT / APPEAL_REVEAL
    // are for re-tried disputes after an appeal.
    enum Phase {
        COMMIT, // jurors submit hidden vote commitments
        REVEAL, // jurors reveal their actual votes
        FINALIZED, // median computed; appeal window open
        APPEALED, // an appeal was filed (dispute is frozen pending appeal outcome)
        APPEAL_COMMIT, // appeal dispute: commit phase
        APPEAL_REVEAL, // appeal dispute: reveal phase
        APPEAL_FINALIZED // appeal dispute finalized; ruling is binding
    }

    // One Dispute struct per opened dispute. Both original disputes and appeal
    // disputes are stored in the same _disputes mapping — they just have different
    // parentDisputeId values.
    //
    // Fields ordered to minimise storage slots:
    // Slot 0: contractId (32)
    // Slot 1: client(20) + phase(1) + finalized(1) + appealed(1) + vrfFulfilled(1) + phaseDeadline(8) = 32 bytes
    // Slot 2: freelancer(20) + … (12 bytes spare)
    // Slot 3: contractAmount (32)
    // Slot 4: feePool (32)
    // Slot 5: ruling (32)
    // Slot 6: appealer(20) + … (12 bytes spare)
    // Slots 7-11: five uint256 fields
    struct Dispute {
        // ── Slot 0 ────────────────────────────────────────────────────────────
        uint256 contractId; // TrustLedger escrow ID this dispute belongs to

        // ── Slot 1 (32/32 bytes) ──────────────────────────────────────────────
        address client; // copied from TrustLedger for convenience
        Phase phase; // current voting phase
        bool finalized; // true after finalizeDispute() succeeds
        bool appealed; // true after appeal() is filed
        bool vrfFulfilled; // true once VRF randomness arrived and jurors were pre-selected
        uint64 phaseDeadline; // unix timestamp when the current phase expires

        // ── Slot 2 (20/32 bytes) ──────────────────────────────────────────────
        address freelancer; // copied from TrustLedger for convenience

        // ── Slots 3-5 ─────────────────────────────────────────────────────────
        uint256 contractAmount; // total escrow value (for reference, not held here)
        uint256 feePool; // ETH held by this contract as juror reward pool
        uint256 ruling; // finalized completionPct (0-100); type(uint256).max = not set

        // ── Slot 6 (20/32 bytes) ──────────────────────────────────────────────
        address appealer; // who filed the appeal (client or freelancer)

        // ── Slots 7-11 ────────────────────────────────────────────────────────
        uint256 appealBond; // ETH the appealer paid as bond
        uint256 appealDisputeId; // disputeId of the follow-up appeal dispute (max = none)
        uint256 parentDisputeId; // disputeId of the original dispute (max = this is original)
        uint256 maxJurors; // max slots; doubles with each appeal
        uint256 jurorCount; // how many jurors have committed so far
    }

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Duration of the commit phase in seconds (72 hours).
    uint256 public constant COMMIT_DURATION = 72 hours;

    /// @notice Duration of the reveal phase in seconds (72 hours).
    uint256 public constant REVEAL_DURATION = 72 hours;

    /// @notice Duration of the appeal window after finalization in seconds (72 hours).
    uint256 public constant APPEAL_WINDOW = 72 hours;

    /// @notice Minimum juror commits required to advance to the reveal phase.
    uint256 public constant MIN_JURORS = 3;

    /// @notice Maximum jurors for a first-instance dispute (5 jurors).
    uint256 public constant BASE_MAX_JURORS = 5;

    /// @notice Appeal bond expressed in basis points of the fee pool (1.5× = 15 000 bps).
    uint256 public constant APPEAL_BOND_MULTIPLIER_BPS = 15_000;

    /// @notice Votes within ±20 pct-points of the median are classified as majority.
    uint256 public constant MAJORITY_THRESHOLD = 20;

    /// @notice Stake slashed from minority / no-reveal jurors in basis points (10%).
    uint256 public constant SLASH_BPS = 1000;

    /// @notice Denominator for basis-point arithmetic (10 000 bps = 100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Votes more than ±30 pct-points from the median trigger a severe slash.
    ///         Deters extreme outlier votes that are characteristic of bribed or colluding jurors.
    uint256 public constant SEVERE_MINORITY_THRESHOLD = 30;

    /// @notice Severe minority slash in basis points (20%).
    uint256 public constant SEVERE_SLASH_BPS = 2000;

    // ─── State ───────────────────────────────────────────────────────────────

    /// @notice The TrustLedger escrow contract that opens disputes and receives rulings.
    ITrustLedger public immutable TRUST_LEDGER;

    /// @notice The JurorRegistry that tracks eligibility, stakes, and slashing.
    IJurorRegistry public immutable JUROR_REGISTRY;

    /// @notice Auto-incrementing dispute ID counter.
    uint256 public nextDisputeId;

    // Primary dispute data (id → struct)
    mapping(uint256 id => Dispute dispute) private _disputes;

    // Per-dispute juror data stored in separate mappings to avoid
    // deeply nested structs (Solidity doesn't allow dynamic arrays inside storage structs cleanly).
    mapping(uint256 id => address[] jurors) private _jurors;
    mapping(uint256 id => mapping(address juror => bytes32 hash)) private _commitments;
    mapping(uint256 id => mapping(address juror => uint256 vote)) private _votes;
    mapping(uint256 id => mapping(address juror => bool committed)) private _committed;
    mapping(uint256 id => mapping(address juror => bool revealed)) private _revealed;
    mapping(uint256 id => mapping(address juror => bool majority)) private _isMajority;
    mapping(uint256 id => mapping(address juror => bool claimed)) private _rewardClaimed;

    // Used to prevent original jurors from also voting in the appeal dispute.
    // A fresh set of jurors ensures the appeal gets an unbiased second opinion.
    mapping(uint256 id => mapping(address juror => bool isOriginal)) private _isOriginalJuror;

    // ETH slashed from minority/no-reveal jurors is pooled here and added to the
    // next appeal's fee pool if an appeal occurs.
    mapping(uint256 id => uint256 amount) private _slashedPool;

    /// @notice Optional Chainlink VRF coordinator. Set once via initVrfCoordinator().
    ///         When set, openDispute() requests randomness and fulfillRandomWords() pre-selects jurors.
    ///         When address(0), jurors self-select by calling commitVote() (legacy mode).
    address public vrfCoordinator;

    // Maps VRF requestId → disputeId so fulfillRandomWords() knows which dispute to update.
    mapping(uint256 requestId => uint256 disputeId) private _pendingVrfRequest;

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new dispute is opened by TrustLedger.
    /// @param disputeId  The new dispute ID.
    /// @param contractId The TrustLedger escrow ID under dispute.
    /// @param client     The client party.
    /// @param freelancer The freelancer party.
    event DisputeOpened(
        uint256 indexed disputeId, uint256 indexed contractId, address indexed client, address freelancer
    );

    /// @notice Emitted when a juror commits a vote.
    /// @param disputeId The dispute ID.
    /// @param juror     The committing juror's address.
    event VoteCommitted(uint256 indexed disputeId, address indexed juror);

    /// @notice Emitted when a juror reveals their vote.
    /// @param disputeId    The dispute ID.
    /// @param juror        The revealing juror's address.
    /// @param completionPct The revealed completion percentage (0–100).
    event VoteRevealed(uint256 indexed disputeId, address indexed juror, uint256 indexed completionPct);

    /// @notice Emitted when a dispute is finalized with a median ruling.
    /// @param disputeId The dispute ID.
    /// @param ruling    The median completion percentage adopted as the ruling.
    event DisputeFinalized(uint256 indexed disputeId, uint256 indexed ruling);

    /// @notice Emitted when a party files an appeal.
    /// @param disputeId The original dispute ID.
    /// @param appealer  The address that filed the appeal.
    /// @param bond      ETH posted as the appeal bond.
    event Appealed(uint256 indexed disputeId, address indexed appealer, uint256 indexed bond);

    /// @notice Emitted when an appeal dispute is created.
    /// @param appealDisputeId   The new appeal dispute ID.
    /// @param originalDisputeId The dispute being appealed.
    event AppealDisputeOpened(uint256 indexed appealDisputeId, uint256 indexed originalDisputeId);

    /// @notice Emitted when a juror committee is pre-selected for a dispute.
    /// @param disputeId The dispute ID.
    /// @param count     Number of jurors selected into the committee.
    event CommitteeSelected(uint256 indexed disputeId, uint256 indexed count);

    /// @notice Emitted when a majority juror claims their fee reward.
    /// @param disputeId The dispute ID.
    /// @param juror     The claiming juror's address.
    /// @param amount    ETH rewarded.
    event RewardClaimed(uint256 indexed disputeId, address indexed juror, uint256 indexed amount);

    // ─── Errors ──────────────────────────────────────────────────────────────

    /// @notice Caller is not the TrustLedger contract.
    error OnlyTrustLedger();

    /// @notice Operation requires COMMIT or APPEAL_COMMIT phase.
    error NotInCommitPhase();

    /// @notice Operation requires REVEAL or APPEAL_REVEAL phase.
    error NotInRevealPhase();

    /// @notice Trying to advance before the phase deadline has elapsed.
    error PhaseNotEnded();

    /// @notice Trying to commit or reveal after the phase deadline.
    error PhaseEnded();

    /// @notice Caller has not committed to this dispute.
    error NotAJuror();

    /// @notice Juror is attempting to commit a second time.
    error AlreadyCommitted();

    /// @notice Juror is attempting to reveal a second time.
    error AlreadyRevealed();

    /// @notice Revealed values do not match the stored commitment hash.
    error InvalidCommitment();

    /// @notice All juror slots are already filled.
    error JurorSlotsFilled();

    /// @notice Caller does not meet juror eligibility requirements.
    error NotEligible();

    /// @notice Dispute has not yet been finalized.
    error DisputeNotFinalized();

    /// @notice Appeal window has already closed.
    error AppealWindowElapsed();

    /// @notice Ruling cannot be executed while the appeal window is still open.
    error AppealWindowNotElapsed();

    /// @notice This dispute already has a pending appeal.
    error AlreadyAppealed();

    /// @notice Sent ETH is less than the required appeal bond.
    error InsufficientAppealBond();

    /// @notice Only a party (client or freelancer) can appeal.
    error NotParty();

    /// @notice Juror has already claimed their reward for this dispute.
    error RewardAlreadyClaimed();

    /// @notice Juror voted in the minority and is not eligible for a reward.
    error NotMajority();

    /// @notice Party addresses and original jurors are excluded from voting.
    error ExcludedJuror();

    /// @notice A required address was the zero address.
    error ZeroAddress();

    /// @notice completionPct is greater than 100.
    error CompletionPctOutOfRange();

    /// @notice Low-level ETH transfer to the recipient failed.
    error EthTransferFailed();

    /// @notice Caller is not the expected contract for this privileged action.
    error Unauthorized();

    /// @notice One-time setter has already been called.
    error AlreadySet();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyTrustLedger() {
        _onlyTrustLedger(); // extracted into a function to save bytecode at each call site
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @notice Deploys Arbitration and binds it to TrustLedger and JurorRegistry.
    /// @param trustLedger_    Address of the TrustLedger contract.
    /// @param jurorRegistry_  Address of the JurorRegistry contract.
    constructor(address trustLedger_, address jurorRegistry_) {
        if (trustLedger_ == address(0) || jurorRegistry_ == address(0)) revert ZeroAddress();
        TRUST_LEDGER = ITrustLedger(trustLedger_);
        JUROR_REGISTRY = IJurorRegistry(jurorRegistry_);
    }

    // ─── TrustLedger-called ───────────────────────────────────────────────────

    // TrustLedger calls this when a client opens a dispute. The fee pool ETH
    // arrives as msg.value and is held by Arbitration until jurors claim rewards.
    // Returns a unique disputeId so TrustLedger can record which dispute it opened.

    /// @notice Open a new dispute. Called only by TrustLedger with the fee pool as msg.value.
    /// @param contractId     TrustLedger escrow ID under dispute.
    /// @param client         Client party address.
    /// @param freelancer     Freelancer party address.
    /// @param contractAmount Total ETH in the escrow.
    /// @param feePool        ETH forwarded as juror reward pool (equals msg.value).
    /// @return disputeId     The ID assigned to the newly created dispute.
    function openDispute(
        uint256 contractId,
        address client,
        address freelancer,
        uint256 contractAmount,
        uint256 feePool
    ) external payable onlyTrustLedger returns (uint256 disputeId) {
        disputeId = nextDisputeId; // capture current ID, then advance the counter
        ++nextDisputeId;

        _disputes[disputeId] = Dispute({
            contractId: contractId,
            client: client,
            phase: Phase.COMMIT, // jurors can start committing immediately
            finalized: false,
            appealed: false,
            vrfFulfilled: false, // set to true by fulfillRandomWords() if VRF is active
            // forge-lint: disable-next-line(unsafe-typecast)
            phaseDeadline: uint64(block.timestamp + COMMIT_DURATION), // 72h to fill slots
            freelancer: freelancer,
            contractAmount: contractAmount,
            feePool: feePool,
            ruling: type(uint256).max, // sentinel: no ruling yet
            appealer: address(0),
            appealBond: 0,
            appealDisputeId: type(uint256).max, // no appeal dispute yet
            parentDisputeId: type(uint256).max, // this IS the original dispute
            maxJurors: BASE_MAX_JURORS, // up to 5 jurors
            jurorCount: 0
        });

        // Select a fixed committee of MIN_JURORS–BASE_MAX_JURORS jurors from the staked pool
        // using verifiable randomness. Two paths:
        //   VRF path: request one random word from Chainlink; fulfillRandomWords() runs the
        //             Fisher-Yates shuffle once the coordinator delivers the word.
        //   RANDAO path: use block.prevrandao (EIP-4399 RANDAO reveal) combined with dispute
        //                context as a synchronous seed; committee is selected immediately.
        if (vrfCoordinator != address(0)) {
            uint256 requestId = IVRFCoordinator(vrfCoordinator)
                .requestRandomWords(
                    bytes32(0), // keyHash — gas lane; set by subscription
                    0, // subId — VRF subscription ID
                    3, // minimumRequestConfirmations
                    200_000, // callbackGasLimit
                    1 // numWords — one word used as Fisher-Yates seed
                );
            _pendingVrfRequest[requestId] = disputeId;
        } else {
            uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, disputeId)));
            _selectJurorsFromSeed(disputeId, seed);
        }

        emit DisputeOpened(disputeId, contractId, client, freelancer);
    }

    // ─── VRF one-time setup ────────────────────────────────────────────────────

    /// @notice Wire in the Chainlink VRF coordinator (optional). Once set it cannot change.
    ///         After this call, new disputes will request randomness for juror selection.
    /// @param vrf_ Address of the deployed Chainlink VRF v2 coordinator.
    function initVrfCoordinator(address vrf_) external {
        if (vrfCoordinator != address(0)) revert AlreadySet();
        if (vrf_ == address(0)) revert ZeroAddress();
        vrfCoordinator = vrf_;
    }

    // ─── VRF callback ──────────────────────────────────────────────────────────

    /// @notice Chainlink VRF coordinator calls this with the requested random word.
    ///         Uses randomWords[0] as the seed for a Fisher-Yates committee selection.
    ///         Pre-selected jurors are marked in _committed and added to _jurors;
    ///         they must still call commitVote() to submit their hidden vote hash.
    /// @param requestId   The VRF request ID returned by requestRandomWords().
    /// @param randomWords Array of random uint256 values (only index 0 is used as seed).
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        if (msg.sender != vrfCoordinator) revert Unauthorized();
        uint256 disputeId = _pendingVrfRequest[requestId];
        delete _pendingVrfRequest[requestId];
        _selectJurorsFromSeed(disputeId, randomWords[0]);
    }

    // ─── Juror actions ────────────────────────────────────────────────────────

    // Step 1 of the commit-reveal scheme: juror submits a hash of their vote.
    // They don't reveal the actual number yet — this prevents jurors from copying
    // each other's votes and only voting with the "crowd" (herding behavior).
    //
    // The commitment must be: keccak256(abi.encodePacked(disputeId, msg.sender, completionPct, salt))
    // The salt is a random secret that prevents brute-force guessing of the vote.

    /// @notice Submit a hashed vote commitment. Emits {VoteCommitted}.
    /// @param disputeId  The dispute to vote on.
    /// @param commitment keccak256(abi.encodePacked(disputeId, msg.sender, completionPct, salt)).
    function commitVote(uint256 disputeId, bytes32 commitment) external {
        Dispute storage d = _disputes[disputeId];

        // Valid in COMMIT or APPEAL_COMMIT (same logic applies to appeal disputes)
        if (d.phase != Phase.COMMIT && d.phase != Phase.APPEAL_COMMIT) revert NotInCommitPhase();
        if (block.timestamp > d.phaseDeadline) revert PhaseEnded();

        if (d.vrfFulfilled) {
            // ── VRF mode ───────────────────────────────────────────────────────
            // Jurors were pre-selected by fulfillRandomWords(). Only they may commit.
            // _committed == true means "pre-selected"; _commitments == bytes32(0) means
            // the juror hasn't submitted their vote hash yet.
            if (_isOriginalJuror[disputeId][msg.sender]) revert ExcludedJuror();
            if (!_committed[disputeId][msg.sender]) revert NotEligible(); // not VRF-selected
            if (_commitments[disputeId][msg.sender] != bytes32(0)) revert AlreadyCommitted();
            // _jurors and jurorCount were already set by fulfillRandomWords(); don't add again.
        } else {
            // ── Legacy (self-select) mode ──────────────────────────────────────
            // Any eligible juror may claim a slot up to maxJurors.
            if (d.jurorCount + 1 > d.maxJurors) revert JurorSlotsFilled();
            if (_committed[disputeId][msg.sender]) revert AlreadyCommitted();
            if (!JUROR_REGISTRY.isEligible(msg.sender)) revert NotEligible();
            if (msg.sender == d.client || msg.sender == d.freelancer) revert ExcludedJuror();
            if (_isOriginalJuror[disputeId][msg.sender]) revert ExcludedJuror();

            _committed[disputeId][msg.sender] = true;
            _jurors[disputeId].push(msg.sender);
            ++d.jurorCount;
        }

        // Record the commitment hash. A sentinel vote marks "not yet revealed".
        _commitments[disputeId][msg.sender] = commitment;
        _votes[disputeId][msg.sender] = type(uint256).max;

        // Lock the juror's stake so they can't withdraw during the dispute.
        JUROR_REGISTRY.lockForDispute(msg.sender);

        emit VoteCommitted(disputeId, msg.sender);
    }

    // Step 2: juror reveals their vote by providing the original values they hashed.
    // The contract re-hashes them and confirms the result matches the stored commitment.
    // This cryptographically proves the juror isn't changing their vote after seeing others.

    /// @notice Reveal a previously committed vote. Emits {VoteRevealed}.
    /// @param disputeId    The dispute ID.
    /// @param completionPct The completion percentage committed to (0–100).
    /// @param salt          The random salt used when forming the commitment.
    function revealVote(uint256 disputeId, uint256 completionPct, bytes32 salt) external {
        Dispute storage d = _disputes[disputeId];
        if (d.phase != Phase.REVEAL && d.phase != Phase.APPEAL_REVEAL) revert NotInRevealPhase();
        if (block.timestamp > d.phaseDeadline) revert PhaseEnded();
        if (!_committed[disputeId][msg.sender]) revert NotAJuror();
        if (_revealed[disputeId][msg.sender]) revert AlreadyRevealed();
        if (completionPct > 100) revert CompletionPctOutOfRange();

        // Reconstruct the commitment and verify it matches what was stored.
        // If the juror tries to reveal a different number than they committed to, this fails.
        // forge-lint: disable-next-line(asm-keccak256)
        bytes32 expected = keccak256(abi.encodePacked(disputeId, msg.sender, completionPct, salt));
        if (expected != _commitments[disputeId][msg.sender]) revert InvalidCommitment();

        _votes[disputeId][msg.sender] = completionPct;
        _revealed[disputeId][msg.sender] = true;

        emit VoteRevealed(disputeId, msg.sender, completionPct);
    }

    // ─── Phase transitions ────────────────────────────────────────────────────

    // Advances from COMMIT → REVEAL (or APPEAL_COMMIT → APPEAL_REVEAL).
    // Anyone can call this — it's permissionless. The condition is:
    //   either the commit window has expired, OR MIN_JURORS slots are filled.
    // Allowing early advance if slots fill up prevents long waits when enough
    // jurors have committed.

    /// @notice Advance a dispute from COMMIT phase to REVEAL phase.
    /// @param disputeId The dispute ID.
    function advanceToReveal(uint256 disputeId) external {
        Dispute storage d = _disputes[disputeId];
        bool isCommit = d.phase == Phase.COMMIT || d.phase == Phase.APPEAL_COMMIT;
        if (!isCommit) revert NotInCommitPhase();

        // Must wait for deadline OR have at least MIN_JURORS committed.
        // `&&` means BOTH conditions must be true to revert (i.e. revert if deadline
        // hasn't passed AND we don't have enough jurors yet).
        if (block.timestamp < uint256(d.phaseDeadline) + 1 && d.jurorCount < MIN_JURORS) revert PhaseNotEnded();

        // Transition to the corresponding reveal phase using a ternary expression.
        d.phase = d.phase == Phase.COMMIT ? Phase.REVEAL : Phase.APPEAL_REVEAL;
        // forge-lint: disable-next-line(unsafe-typecast)
        d.phaseDeadline = uint64(block.timestamp + REVEAL_DURATION); // 72h to reveal
    }

    // Finalizes the dispute after the reveal window has closed.
    // Computes the median vote, classifies majority/minority jurors, slashes minorities,
    // and opens the appeal window.

    /// @notice Finalize a dispute after the reveal window, compute the ruling, and slash minority jurors.
    ///         Emits {DisputeFinalized}.
    /// @param disputeId The dispute ID.
    function finalizeDispute(uint256 disputeId) external nonReentrant {
        Dispute storage d = _disputes[disputeId];
        bool isReveal = d.phase == Phase.REVEAL || d.phase == Phase.APPEAL_REVEAL;
        if (!isReveal) revert NotInRevealPhase();
        if (block.timestamp < uint256(d.phaseDeadline) + 1) revert PhaseNotEnded();

        address[] storage jurors = _jurors[disputeId];
        uint256 jurorLen = jurors.length;

        (uint256[] memory revealedVotes, uint256 revealedCount) = _collectRevealedVotes(disputeId, jurors, jurorLen);
        uint256 ruling = revealedCount == 0 ? 50 : _median(revealedVotes, revealedCount);

        d.ruling = ruling;
        d.finalized = true;
        d.phase = d.phase == Phase.REVEAL ? Phase.FINALIZED : Phase.APPEAL_FINALIZED;
        // forge-lint: disable-next-line(unsafe-typecast)
        d.phaseDeadline = uint64(block.timestamp + APPEAL_WINDOW);

        _slashedPool[disputeId] = _slashAndClassify(disputeId, jurors, jurorLen, ruling);

        emit DisputeFinalized(disputeId, ruling);

        if (d.parentDisputeId != type(uint256).max) {
            _resolveAppeal(disputeId, d.parentDisputeId, ruling);
        }
    }

    // ─── Appeal ───────────────────────────────────────────────────────────────

    // Either party (client or freelancer) can appeal the ruling within the appeal window.
    // They must pay a bond of 1.5× the original fee pool as a skin-in-the-game deposit.
    // The bond is returned if they win the appeal; forfeited if they lose.

    /// @notice File an appeal against a finalized ruling. Emits {Appealed} and {AppealDisputeOpened}.
    /// @param disputeId The dispute ID to appeal.
    function appeal(uint256 disputeId) external payable nonReentrant {
        Dispute storage d = _disputes[disputeId];
        if (!d.finalized) revert DisputeNotFinalized();
        if (d.appealed) revert AlreadyAppealed(); // can only appeal once
        if (block.timestamp > d.phaseDeadline) revert AppealWindowElapsed();
        if (msg.sender != d.client && msg.sender != d.freelancer) revert NotParty(); // only parties can appeal

        // Require a bond of 1.5× the original fee pool.
        // This deters frivolous appeals — if you lose, you lose 1.5× what the jurors cost.
        uint256 required = (d.feePool * APPEAL_BOND_MULTIPLIER_BPS) / BPS_DENOMINATOR;
        if (msg.value < required) revert InsufficientAppealBond();

        d.appealed = true;
        d.appealer = msg.sender;
        d.appealBond = msg.value;

        // Create the appeal dispute — this is a brand-new Dispute entry with doubled juror slots
        // so a larger panel re-evaluates the case.
        uint256 appealId = nextDisputeId;
        ++nextDisputeId;
        d.appealDisputeId = appealId;
        uint256 appealMaxJurors = d.maxJurors * 2; // e.g. 5 → 10 jurors for appeal

        _disputes[appealId] = Dispute({
            contractId: d.contractId,
            client: d.client,
            phase: Phase.APPEAL_COMMIT,
            finalized: false,
            appealed: false,
            vrfFulfilled: false, // appeal disputes also start in legacy mode unless VRF fills them
            // forge-lint: disable-next-line(unsafe-typecast)
            phaseDeadline: uint64(block.timestamp + COMMIT_DURATION),
            freelancer: d.freelancer,
            contractAmount: d.contractAmount,
            feePool: d.feePool + msg.value, // appeal bond added to reward pool
            ruling: type(uint256).max,
            appealer: address(0),
            appealBond: 0,
            appealDisputeId: type(uint256).max,
            parentDisputeId: disputeId, // links back to the original dispute
            maxJurors: appealMaxJurors,
            jurorCount: 0
        });

        // Block original jurors from voting in the appeal (prevents self-serving bias).
        _markOriginalJurors(appealId, _jurors[disputeId]);

        // Select a fresh committee for the appeal dispute using the same VRF/RANDAO logic.
        if (vrfCoordinator != address(0)) {
            uint256 vrfReqId = IVRFCoordinator(vrfCoordinator).requestRandomWords(bytes32(0), 0, 3, 200_000, 1);
            _pendingVrfRequest[vrfReqId] = appealId;
        } else {
            uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, appealId)));
            _selectJurorsFromSeed(appealId, seed);
        }

        emit Appealed(disputeId, msg.sender, msg.value);
        emit AppealDisputeOpened(appealId, disputeId);
    }

    // ─── Reward claim ─────────────────────────────────────────────────────────

    // Majority jurors (who voted within ±20 pct-points of the median) can claim
    // an equal share of the fee pool after the appeal window has passed.
    // The fee pool came from the escrow (arbitrationFeeBps × amount).

    /// @notice Majority juror claims their share of the fee pool. Emits {RewardClaimed}.
    /// @param disputeId The dispute ID.
    function claimReward(uint256 disputeId) external nonReentrant {
        Dispute storage d = _disputes[disputeId];
        if (!d.finalized) revert DisputeNotFinalized();
        // If appealed, must wait until the appeal window closes to prevent premature claims.
        if (d.appealed && block.timestamp < uint256(d.phaseDeadline) + 1) revert AppealWindowNotElapsed();
        if (!_committed[disputeId][msg.sender]) revert NotAJuror();
        if (_rewardClaimed[disputeId][msg.sender]) revert RewardAlreadyClaimed();
        if (!_isMajority[disputeId][msg.sender]) revert NotMajority(); // losers get nothing

        _rewardClaimed[disputeId][msg.sender] = true;

        // Count how many majority jurors there are so we can split evenly.
        address[] storage jurors = _jurors[disputeId];
        uint256 majorityCount = 0;
        for (uint256 i = 0; i < jurors.length; ++i) {
            if (_isMajority[disputeId][jurors[i]]) ++majorityCount;
        }

        // Each majority juror gets an equal share. Integer division means a tiny
        // remainder stays in the contract — acceptable for this use case.
        uint256 share = d.feePool / majorityCount;

        (bool ok,) = msg.sender.call{value: share}("");
        if (!ok) revert EthTransferFailed();

        emit RewardClaimed(disputeId, msg.sender, share);
    }

    // ─── Post-finalization ruling execution ───────────────────────────────────

    // After finalization and the appeal window has passed (with no appeal filed),
    // anyone can trigger the ruling execution back in TrustLedger.
    // Permissionless: no need for a specific address to call it — any account can
    // trigger the payout, which keeps the system self-operating.

    /// @notice Execute the ruling in TrustLedger after the appeal window has passed.
    /// @param disputeId The dispute ID.
    function executeRuling(uint256 disputeId) external nonReentrant {
        Dispute storage d = _disputes[disputeId];
        if (!d.finalized) revert DisputeNotFinalized();
        if (d.appealed) revert AlreadyAppealed(); // can't execute while under appeal
        if (block.timestamp < uint256(d.phaseDeadline) + 1) revert AppealWindowNotElapsed(); // appeal window still open

        // Appeal disputes are resolved via _resolveAppeal(), not here.
        if (d.parentDisputeId != type(uint256).max) {
            return; // this is an appeal dispute; its resolution is handled elsewhere
        }

        // Callback into TrustLedger: distribute escrow funds based on the ruling.
        TRUST_LEDGER.executeRuling(d.contractId, d.ruling);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /// @notice Returns the full Dispute struct for a given dispute ID.
    /// @param disputeId The dispute ID.
    /// @return          A memory copy of the Dispute struct.
    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return _disputes[disputeId];
    }

    /// @notice Returns the list of juror addresses that committed to a dispute.
    /// @param disputeId The dispute ID.
    /// @return          Array of juror addresses.
    function getJurors(uint256 disputeId) external view returns (address[] memory) {
        return _jurors[disputeId];
    }

    /// @notice Returns whether a juror voted in the majority for a given dispute.
    /// @param disputeId The dispute ID.
    /// @param juror     The juror's address.
    /// @return          True if the juror is in the majority.
    function isMajority(uint256 disputeId, address juror) external view returns (bool) {
        return _isMajority[disputeId][juror];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    // Partial Fisher-Yates shuffle over the full juror registry. At each position i,
    // a random index j ∈ [i, n-1] is chosen and swapped to position i; the candidate
    // at that position is accepted if eligible. This guarantees O(n) unique candidates
    // without modulo bias, stopping once maxJurors slots are filled.
    function _selectJurorsFromSeed(uint256 disputeId, uint256 seed) internal {
        Dispute storage d = _disputes[disputeId];
        address[] memory pool = JUROR_REGISTRY.getJurorList();
        uint256 n = pool.length;

        for (uint256 i = 0; i < n && d.jurorCount < d.maxJurors; ++i) {
            // slither-disable-next-line weak-prng — seed derives from block.prevrandao (RANDAO, EIP-4399);
            // this path is only active when Chainlink VRF is not configured.
            uint256 j = i + (seed % (n - i));
            seed = uint256(keccak256(abi.encodePacked(seed)));
            address tmp = pool[i];
            pool[i] = pool[j];
            pool[j] = tmp;

            address candidate = pool[i];
            if (candidate == d.client || candidate == d.freelancer) continue;
            if (_committed[disputeId][candidate]) continue;
            if (_isOriginalJuror[disputeId][candidate]) continue;
            if (!JUROR_REGISTRY.isEligible(candidate)) continue;

            _committed[disputeId][candidate] = true;
            _jurors[disputeId].push(candidate);
            ++d.jurorCount;
        }

        d.vrfFulfilled = true;
        emit CommitteeSelected(disputeId, d.jurorCount);
    }

    // Unlocks all jurors, classifies majority/minority, slashes losers, and returns total slashed.
    function _slashAndClassify(uint256 disputeId, address[] storage jurors, uint256 jurorLen, uint256 ruling)
        internal
        returns (uint256 slashAmount)
    {
        for (uint256 i = 0; i < jurorLen; ++i) {
            address juror = jurors[i];
            JUROR_REGISTRY.unlockFromDispute(juror);

            if (!_revealed[disputeId][juror]) {
                uint256 stake = JUROR_REGISTRY.getJuror(juror).stake;
                uint256 sAmt = (stake * SLASH_BPS) / BPS_DENOMINATOR;
                JUROR_REGISTRY.slash(juror, sAmt);
                slashAmount += sAmt;
                continue;
            }

            uint256 vote = _votes[disputeId][juror];
            bool inMajority =
                ruling + 1 > vote ? ruling - vote < MAJORITY_THRESHOLD + 1 : vote - ruling < MAJORITY_THRESHOLD + 1;

            _isMajority[disputeId][juror] = inMajority;

            if (!inMajority) {
                uint256 stake = JUROR_REGISTRY.getJuror(juror).stake;
                uint256 deviation = ruling > vote ? ruling - vote : vote - ruling;
                uint256 activeBps = deviation > SEVERE_MINORITY_THRESHOLD ? SEVERE_SLASH_BPS : SLASH_BPS;
                uint256 sAmt = (stake * activeBps) / BPS_DENOMINATOR;
                JUROR_REGISTRY.slash(juror, sAmt);
                slashAmount += sAmt;
            }
        }
    }

    // Marks all jurors from originalDisputeId as ineligible to vote in the appeal dispute.
    function _markOriginalJurors(uint256 appealId, address[] storage origJurors) internal {
        for (uint256 i = 0; i < origJurors.length; ++i) {
            _isOriginalJuror[appealId][origJurors[i]] = true;
        }
    }

    // Called from finalizeDispute() when the dispute being finalized is an appeal.
    // The `/*appealDisputeId*/` parameter is unused — commented out to suppress a compiler warning.
    function _resolveAppeal(
        uint256,
        /*appealDisputeId*/
        uint256 originalDisputeId,
        uint256 newRuling
    )
        internal
    {
        Dispute storage orig = _disputes[originalDisputeId];
        address appealer = orig.appealer;
        uint256 bond = orig.appealBond;

        if (newRuling != orig.ruling) {
            // Appeal changed the ruling: the appealer was right, return their bond.
            (bool ok,) = appealer.call{value: bond}("");
            if (!ok) revert EthTransferFailed();
        }
        // If ruling matched, bond is already in the appeal's feePool (forfeited automatically).

        TRUST_LEDGER.executeRuling(orig.contractId, newRuling);
    }

    // Collects revealed votes into a compact array for median computation.
    function _collectRevealedVotes(uint256 disputeId, address[] storage jurors, uint256 jurorLen)
        internal
        view
        returns (uint256[] memory revealedVotes, uint256 revealedCount)
    {
        revealedVotes = new uint256[](jurorLen);
        for (uint256 i = 0; i < jurorLen; ++i) {
            if (_revealed[disputeId][jurors[i]]) {
                revealedVotes[revealedCount] = _votes[disputeId][jurors[i]];
                ++revealedCount;
            }
        }
    }

    // Revert if called by anyone other than the TrustLedger contract.
    function _onlyTrustLedger() internal view {
        if (msg.sender != address(TRUST_LEDGER)) revert OnlyTrustLedger();
    }

    // Computes the median of an array segment [arr[0] .. arr[len-1]] using insertion sort.
    // Insertion sort is O(n²) but acceptable here because arrays are small (3-10 jurors).
    function _median(uint256[] memory arr, uint256 len) internal pure returns (uint256) {
        for (uint256 i = 1; i < len; ++i) {
            uint256 key = arr[i];
            uint256 j = i;
            while (j > 0 && arr[j - 1] > key) {
                arr[j] = arr[j - 1];
                --j;
            }
            arr[j] = key;
        }
        return arr[len / 2];
    }

    // Accept ETH payments — required so the contract can receive the fee pool
    // from TrustLedger's openDispute() call.
    /// @notice Accepts ETH sent directly to this contract (fee pool from TrustLedger).
    receive() external payable {} // solhint-disable-line ordering, no-empty-blocks
}
