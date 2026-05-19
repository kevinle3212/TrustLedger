// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-strict-inequalities
// solhint-disable gas-small-strings
// solhint-disable ordering

// Fork integration tests — exercise the full contract lifecycle against a forked
// chain instead of a fresh in-memory EVM. This catches issues that only appear
// when the deployed nonce sequence, gas prices, or chain state differ from a
// blank slate (the usual unit-test environment).
//
// These tests skip gracefully when no RPC URL is available so they never block
// offline development or CI. Set SEPOLIA_RPC_URL in .env to run them locally:
//
//   FOUNDRY_PROFILE=staging forge test --match-path 'test/fork/**' -vvv
//
// Or use the npm shortcut:
//
//   npm run foundry:test:fork

import {Test, Vm} from "forge-std/Test.sol";
import {TrustLedger} from "../../src/TrustLedger.sol";
import {Arbitration} from "../../src/Arbitration.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";

contract FullLifecycleFork is Test {
    // ── Test constants ────────────────────────────────────────────────────────
    uint256 public constant AMOUNT = 1 ether;
    uint256 public constant ESTIMATED_DURATION = 30 days;
    uint256 public constant BUFFER_FACTOR = 1200; // 1.2×
    uint256 public constant ACCEPTANCE_WINDOW = 48 hours;
    uint16 public constant ARB_FEE_BPS = 1000; // 10%

    bytes32 public constant CONTRACT_HASH = keccak256("fork-test-contract");
    string public constant CONTRACT_URI = "ipfs://QmForkContractHash";
    bytes32 public constant POW_HASH = keccak256("fork-test-proof-of-work");
    string public constant POW_URI = "ipfs://QmForkProofOfWork";

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;

    address public client = makeAddr("client");

    // The freelancer wallet holds a private key so the ECDSA acceptance
    // signature can be reproduced in tests (mirrors the unit test pattern).
    Vm.Wallet internal _freelancerWallet;
    address public freelancer;

    // ── setUp ─────────────────────────────────────────────────────────────────
    function setUp() public {
        // Read the RPC URL from the environment; skip the entire test file when
        // it is absent so offline / CI runs are unaffected.
        string memory rpcUrl = vm.envOr("SEPOLIA_RPC_URL", string(""));
        vm.skip(bytes(rpcUrl).length == 0);

        // Fork Sepolia at the latest available block.  Pinning to a specific
        // block is desirable for long-term reproducibility but requires
        // periodically updating the pin; we leave that as an optional override.
        uint256 blockNumber = vm.envOr("FORK_BLOCK_NUMBER", uint256(0));
        if (blockNumber == 0) {
            vm.createSelectFork(rpcUrl);
        } else {
            vm.createSelectFork(rpcUrl, blockNumber);
        }

        _freelancerWallet = vm.createWallet("freelancer");
        freelancer = _freelancerWallet.addr;

        vm.deal(client, 100 ether);
        vm.deal(freelancer, 10 ether);

        // ── Replicate Deploy.s.sol nonce-prediction logic ─────────────────────
        // TrustLedger, Arbitration, and JurorRegistry have a circular dependency
        // at construction time, broken by pre-computing where each contract will
        // land before any of them are deployed.  This mirrors the production
        // deploy script exactly so the fork test validates that sequence works on
        // a real chain (where the deployer nonce is non-zero).
        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = computeCreateAddress(address(this), nonce + 2);

        jurorRegistry = new JurorRegistry(arbitrationAddr); // nonce
        trustLedger = new TrustLedger(arbitrationAddr); // nonce + 1
        arbitration = new Arbitration( // nonce + 2
            address(trustLedger),
            address(jurorRegistry)
        );

        assertEq(address(arbitration), arbitrationAddr, "arbitration address mismatch");
    }

    // ─── Signing helper ───────────────────────────────────────────────────────
    function _signAccept(uint256 id) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 innerHash = keccak256(abi.encodePacked(id, freelancer));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", innerHash));
        (v, r, s) = vm.sign(_freelancerWallet.privateKey, ethSignedHash);
    }

    // ─── Lifecycle helpers ────────────────────────────────────────────────────
    function _createContract() internal returns (uint256 id) {
        vm.prank(client);
        id = trustLedger.createContract{value: AMOUNT}(
            freelancer,
            CONTRACT_HASH,
            CONTRACT_URI,
            ESTIMATED_DURATION,
            BUFFER_FACTOR,
            ACCEPTANCE_WINDOW,
            ARB_FEE_BPS,
            0, // no hold-back
            0, // no warranty
            address(0), // native ETH escrow
            0
        );
    }

    function _createAndAccept() internal returns (uint256 id) {
        id = _createContract();
        (uint8 v, bytes32 r, bytes32 s) = _signAccept(id);
        vm.prank(freelancer);
        trustLedger.acceptContract(id, v, r, s);
    }

    function _createAcceptAndSubmit() internal returns (uint256 id) {
        id = _createAndAccept();
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    /// @notice Full happy path: create → accept → submit → approve → payout.
    /// Confirms the entire lifecycle works correctly against forked chain state.
    function test_Fork_HappyPath_CreateAcceptSubmitApprove() public {
        uint256 id = _createAcceptAndSubmit();

        uint256 freelancerBefore = freelancer.balance;

        vm.prank(client);
        trustLedger.approveWork(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.APPROVED), "status should be APPROVED");
        assertEq(freelancer.balance, freelancerBefore + AMOUNT, "freelancer should receive full escrow");
    }

    /// @notice Verifies that the nonce-based address prediction matches the
    /// actual deployed addresses, confirming Deploy.s.sol logic is correct on
    /// a forked chain where the deployer nonce is already non-zero.
    function test_Fork_DeployAddressPrediction() public {
        // Deploy a second system to a fresh deployer address so the nonce
        // starts at 0, mirroring what happens when Deploy.s.sol runs for the
        // first time on Sepolia.
        address deployer = makeAddr("freshDeployer");
        vm.deal(deployer, 10 ether);

        uint256 nonce = vm.getNonce(deployer);
        address expectedArbitration = computeCreateAddress(deployer, nonce + 2);
        address expectedTrustLedger = computeCreateAddress(deployer, nonce + 1);

        vm.startPrank(deployer);
        JurorRegistry jReg = new JurorRegistry(expectedArbitration);
        TrustLedger tl = new TrustLedger(expectedArbitration);
        Arbitration arb = new Arbitration(address(tl), address(jReg));
        vm.stopPrank();

        assertEq(address(arb), expectedArbitration, "arbitration address prediction failed");
        assertEq(address(tl), expectedTrustLedger, "trustLedger address prediction failed");
    }

    /// @notice Dispute path: contract goes into arbitration and the ruling
    /// executes the correct payout split (freelancer wins 100%).
    function test_Fork_DisputePath_FreelancerWins() public {
        uint256 id = _createAcceptAndSubmit();

        uint256 feePool = (AMOUNT * ARB_FEE_BPS) / 10_000;
        uint256 remaining = AMOUNT - feePool;

        uint256 freelancerBefore = freelancer.balance;

        vm.prank(client);
        trustLedger.disputeWork(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.DISPUTED), "status should be DISPUTED");
        assertEq(address(arbitration).balance, feePool, "fee pool should land in Arbitration");

        // Arbitration contract calls executeRuling after jurors vote; simulate it.
        vm.prank(address(arbitration));
        trustLedger.executeRuling(id, 100);

        assertEq(freelancer.balance, freelancerBefore + remaining, "freelancer should receive full remaining");
    }

    /// @notice Cancellation refunds the client on a fork, verifying no state
    /// from the forked chain interferes with the escrow accounting.
    function test_Fork_CancelPending_RefundsClient() public {
        uint256 id = _createContract();

        uint256 clientBefore = client.balance;

        vm.prank(client);
        trustLedger.cancelPending(id);

        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(uint8(c.status), uint8(TrustLedger.Status.CANCELLED), "status should be CANCELLED");
        assertEq(client.balance, clientBefore + AMOUNT, "client should be fully refunded");
    }
}
