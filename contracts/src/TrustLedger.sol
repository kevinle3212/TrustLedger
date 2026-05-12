// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable not-rely-on-time
// solhint-disable code-complexity

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IArbitration} from "./interfaces/IArbitration.sol";

// TrustLedger is the core escrow contract. It holds ETH between a client and a
// freelancer and enforces a lifecycle of states that protect both parties:
//   Client deposits → Freelancer accepts → Freelancer submits work →
//   Client approves (or disputes) → Funds released (or arbitrated)
//
// `is ReentrancyGuard` mixes in OpenZeppelin's nonReentrant modifier so that
// functions sending ETH cannot be called recursively by a malicious contract.

/// @title TrustLedger
/// @author Kevin Le, Kellen Snider
/// @notice Decentralized escrow contract for freelance agreements on Arbitrum.
///         Funds are released on client approval, acceptance-window expiry, or an arbitration ruling.
contract TrustLedger is ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    // An enum defines a finite set of named states. Under the hood Solidity
    // stores it as a uint8 (0, 1, 2 …). Using an enum instead of raw numbers
    // makes the code self-documenting and prevents typos.
    enum Status {
        PENDING, // 0 — Contract created; freelancer hasn't responded yet
        ACTIVE, // 1 — Freelancer accepted; project deadline is counting down
        SUBMITTED, // 2 — Freelancer submitted proof-of-work; acceptance window running
        APPROVED, // 3 — Client approved OR acceptance window elapsed (auto-release)
        DISPUTED, // 4 — Client opened a dispute; awaiting arbitration
        RESOLVED, // 5 — Arbitration finalized and ruling executed
        CANCELLED // 6 — Freelancer rejected OR client reclaimed after deadline miss
    }

    // A struct is a custom composite type — like a struct/record in other languages.
    // Each EscrowContract instance lives in the _contracts mapping and represents
    // one freelance agreement, with all its parameters and current state.
    //
    // Fields are ordered to minimise EVM storage slots (32 bytes each).
    // Slot 0: address(20) + uint16(2) + uint16(2) + Status/uint8(1) = 25 bytes
    // Slot 1: address(20) + uint64(8)                               = 28 bytes
    // Slot 2: uint64(8) × 4                                         = 32 bytes
    // Slots 3-5: three uint256 fields                                = 96 bytes
    // Slots 6-9: two bytes32 + two dynamic strings
    struct EscrowContract {
        // ── Slot 0 (25/32 bytes used) ─────────────────────────────────────────
        address client; // who hired the freelancer; deposited the ETH
        uint16 arbitrationFeeBps; // percentage of escrow kept as juror fee (basis points)
        // e.g. 1000 bps = 10%
        uint16 holdBackBps; // percentage withheld until warranty expires (0 or 500–1500 bps)
        Status status; // current lifecycle state (see enum above)

        // ── Slot 1 (28/32 bytes used) ─────────────────────────────────────────
        address freelancer; // who does the work; receives payment
        uint64 warrantyDeadline; // set on approval: approval time + warrantyPeriod

        // ── Slot 2 (32/32 bytes used) ─────────────────────────────────────────
        uint64 projectDeadline; // unix timestamp: when is the project due?
        // = block.timestamp + estimatedDuration × bufferFactor
        uint64 acceptanceWindow; // how long the client has to review submitted work (≥ 48h)
        uint64 acceptanceDeadline; // set when proof is submitted: submission time + acceptanceWindow
        uint64 warrantyPeriod; // how long the freelancer's warranty hold-back is locked

        // ── Slots 3-5 ─────────────────────────────────────────────────────────
        uint256 amount; // total ETH escrowed (in wei; 1 ETH = 10^18 wei)
        uint256 holdBackAmount; // actual ETH held back (computed from holdBackBps × amount)
        uint256 arbitrationId; // the dispute ID in the Arbitration contract (set on dispute)

        // ── Slots 6+ (dynamic) ────────────────────────────────────────────────
        bytes32 contractHash; // keccak256 of the off-chain contract PDF/document;
        // lets anyone verify the document hasn't been tampered with
        string contractURI; // IPFS link to the full document (human-readable)
        bytes32 proofOfWorkHash; // keccak256 of the deliverable; set when freelancer submits
        string proofOfWorkURI; // IPFS link to the deliverable
    }

    // ─── Constants ────────────────────────────────────────────────────────────
    // `public constant` — readable by anyone, zero gas, baked into bytecode.

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

    // ─── State ───────────────────────────────────────────────────────────────

    // `immutable` is set once in the constructor and can never be changed afterward.
    // It's stored more efficiently than a regular state variable (in the bytecode,
    // not storage). SCREAMING_SNAKE_CASE is the Solidity style convention for immutables.

    /// @notice The Arbitration contract that receives fee pools and issues rulings.
    IArbitration public immutable ARBITRATION;

    // Auto-incrementing counter. The first contract gets id=0, next id=1, etc.
    // `public` auto-generates a getter function: `trustLedger.nextId()`.

    /// @notice Auto-incrementing ID counter; the next contract created receives this ID.
    uint256 public nextId;

    // Maps contract id → EscrowContract struct. `private` means external callers
    // must use `getContract(id)` — keeps storage access controlled.
    mapping(uint256 id => EscrowContract escrow) private _contracts;

    // ─── Events ──────────────────────────────────────────────────────────────
    // Events are the blockchain's equivalent of logging. They're stored in
    // transaction receipts (not in storage), so they're very cheap.
    // Front-ends listen to events to update UI without polling the chain.
    // Up to 3 fields can be `indexed` — indexed fields are searchable by block explorers.

    /// @notice Emitted when a new escrow contract is created.
    /// @param id       Contract identifier.
    /// @param client    Address that deposited funds.
    /// @param freelancer Address hired to complete the work.
    /// @param amount   ETH locked in escrow (wei).
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

    /// @notice Emitted when ETH is transferred out of escrow.
    /// @param id     Contract identifier.
    /// @param to     Recipient address.
    /// @param amount ETH transferred (wei).
    event FundsReleased(uint256 indexed id, address indexed to, uint256 indexed amount);

    /// @notice Emitted when the client reclaims funds after a deadline miss.
    /// @param id Contract identifier.
    event ContractCancelled(uint256 indexed id);

    /// @notice Emitted when the freelancer collects a warranty hold-back.
    /// @param id         Contract identifier.
    /// @param freelancer Recipient address.
    /// @param amount     ETH collected (wei).
    event WarrantyFundsClaimed(uint256 indexed id, address indexed freelancer, uint256 indexed amount);

    /// @notice Emitted when an arbitration ruling is executed and funds distributed.
    /// @param id            Contract identifier.
    /// @param completionPct Juror-determined completion percentage (0–100).
    event RulingExecuted(uint256 indexed id, uint256 indexed completionPct);

    // ─── Errors ──────────────────────────────────────────────────────────────
    // Custom errors are ABI-encoded as a 4-byte selector, making reverts cheaper
    // than `require(condition, "string")` which encodes a full string.

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

    /// @notice No ETH was sent with the transaction.
    error InsufficientFunds();

    /// @notice The freelancer address cannot be the zero address.
    error ZeroAddress();

    /// @notice The client cannot hire themselves.
    error SelfContract();

    /// @notice completionPct is greater than 100.
    error CompletionPctOutOfRange();

    /// @notice Low-level ETH transfer to the recipient failed.
    error EthTransferFailed();

    // ─── Constructor ─────────────────────────────────────────────────────────
    // `constructor` runs once at deploy time. Parameters are the deploy arguments.
    // We receive the Arbitration address as a parameter (not hardcoded) so the
    // contract is testable with mock arbitration addresses.

    /// @notice Deploys TrustLedger and binds it to an Arbitration contract.
    /// @param arbitration_ Address of the deployed Arbitration contract.
    constructor(address arbitration_) {
        if (arbitration_ == address(0)) revert ZeroAddress();
        ARBITRATION = IArbitration(arbitration_); // wrap address in interface type for type safety
    }

    // ─── Client: create ───────────────────────────────────────────────────────
    // The client calls this to create an escrow and lock their ETH.
    // `external` — only callable from outside (not from within this contract).
    // `payable` — accepts ETH sent with the transaction (msg.value).
    // `returns (uint256 id)` — named return value; Solidity assigns it before the
    //                          function returns.

    /// @notice Create an escrow contract and lock ETH. Emits {ContractCreated}.
    /// @param freelancer        Address of the hired freelancer.
    /// @param contractHash      keccak256 of the off-chain contract document.
    /// @param contractURI       IPFS URI pointing to the contract document.
    /// @param estimatedDuration How long the project should take, in seconds.
    /// @param bufferFactor      Deadline multiplier × 1000 (e.g. 1200 = 1.2×; minimum 1100).
    /// @param acceptanceWindow  Review period after submission, in seconds (≥ 48 h).
    /// @param arbitrationFeeBps Juror fee as basis points (e.g. 1000 = 10%; max 5000).
    /// @param holdBackBps       Warranty retention as basis points (0 = none; or 500–1500).
    /// @param warrantyPeriod    How long warranty hold-back is locked after approval, in seconds.
    /// @return id               The ID of the newly created escrow contract.
    function createContract(
        address freelancer,
        bytes32 contractHash,
        string calldata contractURI, // `calldata` is read-only and cheaper than `memory`
        // for external function string/bytes params
        uint256 estimatedDuration,
        uint256 bufferFactor,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod
    ) external payable returns (uint256 id) {
        // Input validation — follows the "checks-effects-interactions" pattern.
        _validateCreateParams(
            freelancer, bufferFactor, acceptanceWindow, arbitrationFeeBps, holdBackBps, warrantyPeriod
        );

        // Assign and increment the counter: capture current value, then advance the counter.
        id = nextId;
        ++nextId;

        // Project deadline = now + (estimatedDuration × bufferFactor / 1000).
        // Dividing by 1000 allows fractional multipliers like 1.2 expressed as 1200.
        uint256 deadline = block.timestamp + (estimatedDuration * bufferFactor) / 1000;

        // Write the struct into storage. All ETH sent (msg.value) is held by this contract.
        _contracts[id] = EscrowContract({
            client: msg.sender,
            arbitrationFeeBps: arbitrationFeeBps,
            holdBackBps: holdBackBps,
            status: Status.PENDING,
            freelancer: freelancer,
            warrantyDeadline: 0, // set on approval
            // forge-lint: disable-next-line(unsafe-typecast)
            projectDeadline: uint64(deadline), // safe: timestamps won't exceed uint64 for centuries
            // forge-lint: disable-next-line(unsafe-typecast)
            acceptanceWindow: uint64(acceptanceWindow), // safe: validated ≥ 48h, reasonable upper bound
            acceptanceDeadline: 0, // set when freelancer submits
            warrantyPeriod: warrantyPeriod,
            amount: msg.value,
            holdBackAmount: 0, // computed on approval
            arbitrationId: 0, // set when dispute is opened
            contractHash: contractHash,
            contractURI: contractURI,
            proofOfWorkHash: bytes32(0), // not set until freelancer submits
            proofOfWorkURI: ""
        });

        emit ContractCreated(id, msg.sender, freelancer, msg.value);
    }

    // ─── Client: approve / dispute ────────────────────────────────────────────

    // Client explicitly approves the submitted work within the acceptance window.
    // Immediately releases funds to the freelancer (minus any hold-back).
    // `nonReentrant` because this sends ETH, which could trigger a malicious callback.

    /// @notice Client approves submitted work and releases funds. Emits {WorkApproved} and {FundsReleased}.
    /// @param id The escrow contract ID.
    function approveWork(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id]; // storage ref — edits go to chain
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.SUBMITTED) revert InvalidStatus(c.status);
        if (block.timestamp > c.acceptanceDeadline) revert WindowElapsed(); // window already closed

        c.status = Status.APPROVED;
        _releaseToFreelancer(id, c); // internal helper handles holdback + transfer

        emit WorkApproved(id);
    }

    // Client disputes the submitted work, opening a juror vote in Arbitration.
    // Not nonReentrant because the only ETH movement is into Arbitration (a trusted contract).

    /// @notice Client disputes submitted work, forwarding the fee pool to Arbitration. Emits {WorkDisputed}.
    /// @param id The escrow contract ID.
    function disputeWork(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.SUBMITTED) revert InvalidStatus(c.status);
        if (block.timestamp > c.acceptanceDeadline) revert WindowElapsed();

        // Calculate the fee pool: a portion of the escrow earmarked for juror rewards.
        // This ETH is forwarded to Arbitration via `openDispute`.
        uint256 feePool = (c.amount * c.arbitrationFeeBps) / BPS_DENOMINATOR;
        c.status = Status.DISPUTED;

        // `{value: feePool}` sends ETH with the call. Arbitration holds it until
        // jurors claim their rewards after the dispute finalizes.
        uint256 arbId = ARBITRATION.openDispute{value: feePool}(id, c.client, c.freelancer, c.amount, feePool);
        c.arbitrationId = arbId;

        emit WorkDisputed(id, arbId);
    }

    // ─── Client: reclaim after deadline miss ──────────────────────────────────
    // If the freelancer accepted but never submitted work by the deadline,
    // the client can reclaim their full payment.

    /// @notice Client reclaims escrow after freelancer missed the project deadline. Emits {ContractCancelled}.
    /// @param id The escrow contract ID.
    function claimAfterDeadlineMiss(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.client) revert Unauthorized();
        if (c.status != Status.ACTIVE) revert InvalidStatus(c.status);
        if (block.timestamp < uint256(c.projectDeadline) + 1) revert DeadlineNotElapsed(); // too early

        c.status = Status.CANCELLED;

        // Zero out the amount before sending — "effects before interactions".
        // This prevents a reentrancy attack where the callback reads amount > 0
        // and calls claimAfterDeadlineMiss again before the transfer finishes.
        uint256 amount = c.amount;
        c.amount = 0;

        _sendEth(c.client, amount);
        emit ContractCancelled(id);
    }

    // ─── Freelancer: accept / reject ──────────────────────────────────────────

    // Freelancer agrees to take the job. Moves contract from PENDING → ACTIVE.
    // The deadline check prevents a freelancer from accepting a stale contract.

    /// @notice Freelancer accepts the contract. Emits {ContractAccepted}.
    /// @param id The escrow contract ID.
    function acceptContract(uint256 id) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.PENDING) revert InvalidStatus(c.status);
        if (block.timestamp > c.projectDeadline) revert DeadlineElapsed(); // offer expired

        c.status = Status.ACTIVE;
        emit ContractAccepted(id);
    }

    // Freelancer declines the job. ETH is returned to the client immediately.

    /// @notice Freelancer rejects the contract and returns funds to the client. Emits {ContractRejected}.
    /// @param id The escrow contract ID.
    function rejectContract(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.PENDING) revert InvalidStatus(c.status);

        c.status = Status.CANCELLED;
        uint256 amount = c.amount;
        c.amount = 0; // zero before sending (reentrancy pattern)

        _sendEth(c.client, amount);
        emit ContractRejected(id);
    }

    // ─── Freelancer: submit proof of work ────────────────────────────────────
    // Freelancer submits a hash + IPFS link proving they completed the work.
    // This starts the acceptance window — the client now has `acceptanceWindow`
    // seconds to either approve or dispute.

    /// @notice Freelancer submits proof of work, starting the acceptance window. Emits {ProofSubmitted}.
    /// @param id      The escrow contract ID.
    /// @param powHash keccak256 of the deliverable artifact.
    /// @param powURI  IPFS URI pointing to the deliverable.
    function submitProofOfWork(uint256 id, bytes32 powHash, string calldata powURI) external {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.ACTIVE) revert InvalidStatus(c.status);
        if (block.timestamp > c.projectDeadline) revert DeadlineElapsed(); // submitted too late

        c.proofOfWorkHash = powHash;
        c.proofOfWorkURI = powURI;
        // acceptanceDeadline = now + acceptanceWindow (the review window starts ticking)
        c.acceptanceDeadline = uint64(block.timestamp + c.acceptanceWindow);
        c.status = Status.SUBMITTED;

        emit ProofSubmitted(id, powHash, powURI);
    }

    // ─── Freelancer: claim after acceptance window ────────────────────────────
    // If the client never approves or disputes within the acceptance window,
    // the freelancer can claim payment automatically (client had their chance).

    /// @notice Freelancer claims payment after the acceptance window elapses.
    ///         Emits {WorkApproved} and {FundsReleased}.
    /// @param id The escrow contract ID.
    function claimAfterAcceptanceWindow(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.SUBMITTED) revert InvalidStatus(c.status);
        if (block.timestamp < uint256(c.acceptanceDeadline) + 1) revert WindowNotElapsed(); // window still open

        c.status = Status.APPROVED;
        _releaseToFreelancer(id, c);

        emit WorkApproved(id);
    }

    // ─── Freelancer: claim warranty hold-back ────────────────────────────────
    // After the warranty period expires, the freelancer can collect the withheld
    // portion. The warranty period gives the client recourse if defects appear
    // shortly after delivery.

    /// @notice Freelancer claims the warranty hold-back after the warranty period expires.
    ///         Emits {WarrantyFundsClaimed}.
    /// @param id The escrow contract ID.
    function claimWarrantyFunds(uint256 id) external nonReentrant {
        EscrowContract storage c = _contracts[id];
        if (msg.sender != c.freelancer) revert Unauthorized();
        if (c.status != Status.APPROVED) revert InvalidStatus(c.status);
        if (c.holdBackAmount == 0) revert InvalidHoldBack(); // no hold-back to claim
        if (block.timestamp < uint256(c.warrantyDeadline) + 1) revert WindowNotElapsed(); // warranty still active

        uint256 amount = c.holdBackAmount;
        c.holdBackAmount = 0; // zero before sending

        _sendEth(c.freelancer, amount);
        emit WarrantyFundsClaimed(id, c.freelancer, amount);
    }

    // ─── Arbitration callback ─────────────────────────────────────────────────
    // This is the only function Arbitration is allowed to call on TrustLedger.
    // It executes the jurors' ruling: distributes ETH to client and/or freelancer
    // according to the completion percentage they voted on.
    //
    // completionPct interpretation:
    //   0   → client wins all remaining funds (freelancer delivered nothing)
    //   100 → freelancer wins all remaining funds (delivered in full)
    //   1-99 → partial split: freelancerPay = (2 × pct × totalAmount) / 300
    //           This formula gives the freelancer 2/3 of their claimed share,
    //           representing a conservative partial credit.

    /// @notice Execute a juror ruling and distribute escrow funds. Called only by Arbitration. Emits {RulingExecuted}.
    /// @param id            The escrow contract ID.
    /// @param completionPct Juror-determined completion percentage (0 = client wins, 100 = freelancer wins).
    function executeRuling(uint256 id, uint256 completionPct) external nonReentrant {
        if (msg.sender != address(ARBITRATION)) revert Unauthorized(); // only Arbitration can call
        if (completionPct > 100) revert CompletionPctOutOfRange();

        EscrowContract storage c = _contracts[id];
        if (c.status != Status.DISPUTED) revert InvalidStatus(c.status);

        c.status = Status.RESOLVED;

        // The fee pool was already forwarded to Arbitration when the dispute was opened.
        // Here we compute it again just to know how much "remaining" is left for the parties.
        uint256 feePool = (c.amount * c.arbitrationFeeBps) / BPS_DENOMINATOR;
        uint256 remaining = c.amount - feePool; // this is what client + freelancer share

        uint256 freelancerPay;
        if (completionPct == 100) {
            freelancerPay = remaining; // full win for freelancer
        } else if (completionPct == 0) {
            freelancerPay = 0; // full win for client
        } else {
            // Partial payout: 2/3 of claimed completion percentage
            // e.g. 50% → freelancer gets (2 × 50 × amount) / 300 ≈ 33% of amount
            freelancerPay = (2 * completionPct * c.amount) / 300;
            if (freelancerPay > remaining) freelancerPay = remaining; // cap at remaining
        }

        // Client gets whatever the freelancer doesn't.
        uint256 clientRefund = remaining - freelancerPay;

        if (freelancerPay > 0) {
            _sendEth(c.freelancer, freelancerPay);
            emit FundsReleased(id, c.freelancer, freelancerPay);
        }
        if (clientRefund > 0) {
            _sendEth(c.client, clientRefund);
            emit FundsReleased(id, c.client, clientRefund);
        }

        emit RulingExecuted(id, completionPct);
    }

    // ─── View ────────────────────────────────────────────────────────────────
    // Returns a memory copy of the stored struct. Callers (tests, front-ends)
    // use this to inspect any contract's full state.

    /// @notice Returns the full state of an escrow contract.
    /// @param id The escrow contract ID.
    /// @return   A memory copy of the EscrowContract struct.
    function getContract(uint256 id) external view returns (EscrowContract memory) {
        return _contracts[id];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    // Validation helper extracted from createContract to keep that function under the line limit.
    function _validateCreateParams(
        address freelancer,
        uint256 bufferFactor,
        uint256 acceptanceWindow,
        uint16 arbitrationFeeBps,
        uint16 holdBackBps,
        uint64 warrantyPeriod
    ) internal {
        if (freelancer == address(0)) revert ZeroAddress();
        if (freelancer == msg.sender) revert SelfContract();
        if (msg.value == 0) revert InsufficientFunds();
        if (bufferFactor < MIN_BUFFER_FACTOR) revert InvalidBufferFactor();
        if (acceptanceWindow < MIN_ACCEPTANCE_WINDOW) revert InvalidAcceptanceWindow();
        if (arbitrationFeeBps == 0 || arbitrationFeeBps > MAX_ARBITRATION_FEE_BPS) revert InvalidArbitrationFee();
        bool hbOutOfRange = holdBackBps < MIN_HOLD_BACK_BPS || holdBackBps > MAX_HOLD_BACK_BPS;
        if (holdBackBps != 0 && hbOutOfRange) revert InvalidHoldBack();
        if (holdBackBps != 0 && warrantyPeriod == 0) revert InvalidWarrantyPeriod();
        if (holdBackBps == 0 && warrantyPeriod != 0) revert InvalidWarrantyPeriod();
    }

    // Shared logic for approveWork and claimAfterAcceptanceWindow.
    // Computes the hold-back (if any), sends the freelancer their immediate payout,
    // and records the hold-back amount + warranty deadline for later claiming.
    function _releaseToFreelancer(uint256 id, EscrowContract storage c) internal {
        // holdBack = amount × holdBackBps / 10000  (e.g. 1000 bps = 10%)
        uint256 holdBack = (c.amount * c.holdBackBps) / BPS_DENOMINATOR;
        uint256 payout = c.amount - holdBack;

        if (holdBack > 0) {
            c.holdBackAmount = holdBack;
            // warrantyDeadline starts from NOW (approval time), not from submission time.
            c.warrantyDeadline = uint64(block.timestamp + c.warrantyPeriod);
        }

        if (payout > 0) {
            _sendEth(c.freelancer, payout);
            emit FundsReleased(id, c.freelancer, payout);
        }
    }

    // Low-level ETH transfer helper. `call` is safer than `transfer` because:
    //   - `transfer` forwards only 2300 gas, which fails for smart contract recipients
    //   - `call` forwards all available gas and returns a success flag
    // `mixedCase` naming convention: _sendEth (not _sendETH) per Solidity style guide.
    function _sendEth(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}(""); // empty calldata = plain ETH send
        if (!ok) revert EthTransferFailed();
    }
}
