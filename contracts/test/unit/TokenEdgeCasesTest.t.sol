// SPDX-License-Identifier: Apache-2.0
// solhint-disable one-contract-per-file
pragma solidity ^0.8.24;

// solhint-disable func-name-mixedcase
// solhint-disable not-rely-on-time
// solhint-disable use-natspec
// solhint-disable gas-small-strings
// solhint-disable ordering

import {Test} from "forge-std/Test.sol";
import {Arbitration} from "../../src/Arbitration.sol";
import {JurorRegistry} from "../../src/JurorRegistry.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {MockUSDC} from "../../src/mocks/MockUSDC.sol";
import {StakingVault} from "../../src/StakingVault.sol";
import {TrustLedger} from "../../src/TrustLedger.sol";

/// @notice Minimal fee-on-transfer ERC-20: burns a fixed basis-point fee on every
///         transfer/transferFrom, so the recipient receives less than `amount`.
contract FeeOnTransferToken {
    uint256 public constant FEE_BPS = 100; // 1% fee burned on transfer
    uint256 public constant BPS = 10_000;

    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool result) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool result) {
        return _move(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool result) {
        allowance[from][msg.sender] -= amount;
        return _move(from, to, amount);
    }

    function _move(address from, address to, uint256 amount) internal returns (bool result) {
        uint256 fee = (amount * FEE_BPS) / BPS;
        uint256 net = amount - fee;
        balanceOf[from] -= amount;
        balanceOf[to] += net; // fee is burned; recipient gets less than `amount`
        return true;
    }
}

/// @title TokenEdgeCasesTest
/// @author Kevin Le
/// @notice Regression tests for two audit medium findings: fee-on-transfer ERC-20 escrow
///         must store the actual received amount so payouts stay solvent (#10), and the
///         StakingVault owner must not be able to recover reward tokens reserved for
///         stakers (#11).
contract TokenEdgeCasesTest is Test {
    uint256 public constant AMOUNT = 1000 ether;
    uint256 public constant ESTIMATED_DURATION = 30 days;
    uint256 public constant BUFFER_FACTOR = 1200;
    uint256 public constant ACCEPTANCE_WINDOW = 48 hours;
    uint256 public constant FOT_FEE_BPS = 100;
    uint16 public constant ARB_FEE_BPS = 1000;
    bytes32 public constant CONTRACT_HASH = keccak256("doc");
    string public constant CONTRACT_URI = "ipfs://doc";
    bytes32 public constant POW_HASH = keccak256("pow");
    string public constant POW_URI = "ipfs://pow";

    TrustLedger public trustLedger;
    Arbitration public arbitration;
    JurorRegistry public jurorRegistry;
    FeeOnTransferToken public fot;

    address public client = makeAddr("client");
    address public freelancer = makeAddr("freelancer");

    function setUp() public {
        uint256 nonce = vm.getNonce(address(this));
        address arbitrationAddr = vm.computeCreateAddress(address(this), nonce + 2);
        jurorRegistry = new JurorRegistry(arbitrationAddr);
        trustLedger = new TrustLedger(arbitrationAddr);
        arbitration = new Arbitration(address(trustLedger), address(jurorRegistry));

        fot = new FeeOnTransferToken();
        trustLedger.addAllowedToken(address(fot)); // callable pre-pauser
        fot.mint(client, AMOUNT);
        vm.deal(client, 10 ether);
    }

    // ─── #10 Fee-on-transfer escrow stores the actual received amount
    // ───────────

    function test_FoT_AcceptContract_StoresActualReceivedAmount() public {
        vm.prank(freelancer);
        uint256 id = trustLedger.proposeContract({
            client: client,
            contractHash: CONTRACT_HASH,
            contractURI: CONTRACT_URI,
            estimatedDuration: ESTIMATED_DURATION,
            bufferFactor: BUFFER_FACTOR,
            acceptanceWindow: ACCEPTANCE_WINDOW,
            arbitrationFeeBps: ARB_FEE_BPS,
            holdBackBps: 0,
            warrantyPeriod: 0,
            token: address(fot),
            amount: AMOUNT
        });

        vm.startPrank(client);
        fot.approve(address(trustLedger), AMOUNT);
        trustLedger.acceptContract(id);
        vm.stopPrank();

        uint256 received = fot.balanceOf(address(trustLedger));
        assertLt(received, AMOUNT, "FoT delivered less than requested");

        // The escrow must record the real balance, not the nominal amount, so payouts
        // never exceed what the contract actually holds.
        TrustLedger.EscrowContract memory c = trustLedger.getContract(id);
        assertEq(c.amount, received, "stored amount equals received");

        // Full payout path stays solvent: freelancer submits, client approves, funds flow.
        vm.prank(freelancer);
        trustLedger.submitProofOfWork(id, POW_HASH, POW_URI);
        uint256 freelancerBefore = fot.balanceOf(freelancer);
        vm.prank(client);
        trustLedger.approveWork(id);
        assertEq(
            fot.balanceOf(freelancer) - freelancerBefore, _netAfterFee(received), "freelancer paid from real balance"
        );
    }

    function _netAfterFee(uint256 amount) internal pure returns (uint256 result) {
        uint256 fee = (amount * FOT_FEE_BPS) / 10_000;
        return amount - fee;
    }
}

/// @title StakingVaultRecoverTest
/// @author Kevin Le
/// @notice Reward-token recovery must never dip into rewards reserved for stakers.
contract StakingVaultRecoverTest is Test {
    uint256 public constant ONE = 1e6;
    uint256 public constant DURATION = 7 days;

    MockUSDC public stakeToken;
    MockERC20 public rewardToken;
    StakingVault public vault;

    address public owner = makeAddr("owner");
    address public alice = makeAddr("alice");

    function setUp() public {
        stakeToken = new MockUSDC();
        rewardToken = new MockERC20();
        // Distinct staking and reward tokens — the scenario the audit flagged.
        vault = new StakingVault(address(stakeToken), address(rewardToken), owner);

        stakeToken.mint(alice, 1000 * ONE);
        vm.prank(alice);
        stakeToken.approve(address(vault), type(uint256).max);
    }

    function test_RecoverRewardToken_CannotDrainReservedRewards() public {
        // Alice stakes; owner funds a reward schedule.
        vm.prank(alice);
        vault.stake(100 * ONE);

        uint256 reward = 700 * ONE;
        rewardToken.mint(address(vault), reward);
        vm.prank(owner);
        vault.notifyRewardAmount(reward);

        // Immediately after funding, essentially the whole schedule is reserved.
        uint256 reserved = vault.reservedRewards();
        assertGt(reserved, 0, "rewards reserved");

        // Trying to sweep the reserved rewards must revert.
        vm.expectRevert(StakingVault.CannotRecoverReservedRewards.selector);
        vm.prank(owner);
        vault.recoverERC20(address(rewardToken), reward);
    }

    function test_RecoverRewardToken_AllowsSurplusOnly() public {
        vm.prank(alice);
        vault.stake(100 * ONE);

        uint256 reward = 100 * ONE;
        rewardToken.mint(address(vault), reward);
        vm.prank(owner);
        vault.notifyRewardAmount(reward);

        // Mint an accidental surplus on top of the funded schedule.
        uint256 surplus = 50 * ONE;
        rewardToken.mint(address(vault), surplus);

        uint256 balance = rewardToken.balanceOf(address(vault));
        uint256 reserved = vault.reservedRewards();
        uint256 recoverable = balance - reserved;
        assertGe(recoverable, surplus - 2, "surplus recoverable (allowing rounding)");

        uint256 ownerBefore = rewardToken.balanceOf(owner);
        vm.prank(owner);
        vault.recoverERC20(address(rewardToken), recoverable);
        assertEq(rewardToken.balanceOf(owner) - ownerBefore, recoverable, "owner recovered surplus");

        // The reserved remainder is still present for stakers.
        assertGe(rewardToken.balanceOf(address(vault)), reserved, "reserve intact");
    }
}
