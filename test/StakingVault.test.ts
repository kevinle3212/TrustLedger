// test/StakingVault.test.ts - Hardhat/Mocha/Chai suite for the USDC StakingVault.
// Mirrors contracts/test/unit/StakingVaultTest.t.sol through the TypeScript + ethers.js
// ecosystem, focusing on 6-decimal accounting, reward accrual, and error paths.
//
// Run with: npm run hardhat:test

import { expect } from "chai";
import { network } from "hardhat";
import type { Signer } from "ethers";

import type { MockUSDC, StakingVault } from "../artifacts/typechain-types";

const { ethers } = await network.create();

describe("StakingVault", function () {
	let usdc: MockUSDC;
	let vault: StakingVault;
	let owner: Signer;
	let alice: Signer;
	let bob: Signer;
	let stranger: Signer;

	// USDC has 6 decimals; 1 USDC = 1_000_000 smallest units.
	const ONE_USDC = 1_000_000n;
	const DURATION = 7n * 24n * 3600n; // matches StakingVault default rewardsDuration

	async function increaseTime(seconds: bigint): Promise<void> {
		await ethers.provider.send("evm_increaseTime", [Number(seconds)]);
		await ethers.provider.send("evm_mine", []);
	}

	async function deployFixture() {
		const signers = await ethers.getSigners();
		owner = signers[0];
		alice = signers[1];
		bob = signers[2];
		stranger = signers[3];

		const usdcFactory = await ethers.getContractFactory("MockUSDC");
		usdc = (await usdcFactory.deploy()) as unknown as MockUSDC;

		const vaultFactory = await ethers.getContractFactory("StakingVault");
		vault = (await vaultFactory.deploy(
			await usdc.getAddress(),
			await usdc.getAddress(),
			await owner.getAddress(),
		)) as unknown as StakingVault;

		const vaultAddr = await vault.getAddress();
		for (const account of [alice, bob]) {
			const addr = await account.getAddress();
			await usdc.mint(addr, 1_000n * ONE_USDC);
			await usdc.connect(account).approve(vaultAddr, ethers.MaxUint256);
		}
	}

	// Funds the vault with `reward` USDC and starts a distribution over the default duration.
	async function fundRewards(reward: bigint): Promise<void> {
		await usdc.mint(await vault.getAddress(), reward);
		await vault.connect(owner).notifyRewardAmount(reward);
	}

	beforeEach(async function () {
		await deployFixture();
	});

	it("stores the staking token's 6 decimals at deploy", async function () {
		expect(await vault.STAKING_TOKEN_DECIMALS()).to.equal(6);
		expect(await vault.owner()).to.equal(await owner.getAddress());
	});

	it("rejects a zero token address", async function () {
		const vaultFactory = await ethers.getContractFactory("StakingVault");
		await expect(
			vaultFactory.deploy(
				ethers.ZeroAddress,
				await usdc.getAddress(),
				await owner.getAddress(),
			),
		).to.be.revertedWithCustomError(vault, "ZeroAddress");
	});

	it("updates balances on stake", async function () {
		await vault.connect(alice).stake(100n * ONE_USDC);
		expect(await vault.balanceOf(await alice.getAddress())).to.equal(100n * ONE_USDC);
		expect(await vault.totalStaked()).to.equal(100n * ONE_USDC);
	});

	it("reverts staking zero", async function () {
		await expect(vault.connect(alice).stake(0)).to.be.revertedWithCustomError(
			vault,
			"ZeroAmount",
		);
	});

	it("reverts withdrawing more than staked", async function () {
		await vault.connect(alice).stake(10n * ONE_USDC);
		await expect(vault.connect(alice).withdraw(11n * ONE_USDC)).to.be.revertedWithCustomError(
			vault,
			"InsufficientStake",
		);
	});

	it("returns tokens on withdraw", async function () {
		await vault.connect(alice).stake(100n * ONE_USDC);
		await vault.connect(alice).withdraw(40n * ONE_USDC);
		expect(await vault.balanceOf(await alice.getAddress())).to.equal(60n * ONE_USDC);
		expect(await usdc.balanceOf(await alice.getAddress())).to.equal(940n * ONE_USDC);
	});

	it("pays a single staker the whole pool with no 6-decimal truncation", async function () {
		const reward = DURATION; // rate = 1 unit/sec
		await vault.connect(alice).stake(ONE_USDC);
		await fundRewards(reward);
		await increaseTime(DURATION);
		// Allow at most 1 second of accrual variance from mining timestamps.
		const earned = await vault.earned(await alice.getAddress());
		expect(earned).to.be.greaterThanOrEqual(reward);
	});

	it("splits rewards proportionally between equal stakers", async function () {
		const reward = DURATION * 2n;
		await vault.connect(alice).stake(ONE_USDC);
		await vault.connect(bob).stake(ONE_USDC);
		await fundRewards(reward);
		await increaseTime(DURATION);

		const aliceEarned = await vault.earned(await alice.getAddress());
		const bobEarned = await vault.earned(await bob.getAddress());
		// Equal stake → equal accrual.
		expect(aliceEarned).to.equal(bobEarned);
	});

	it("transfers and zeroes rewards on getReward", async function () {
		await vault.connect(alice).stake(ONE_USDC);
		await fundRewards(DURATION);
		await increaseTime(DURATION);

		const before = await usdc.balanceOf(await alice.getAddress());
		await vault.connect(alice).getReward();
		expect(await usdc.balanceOf(await alice.getAddress())).to.be.greaterThan(before);
		expect(await vault.rewards(await alice.getAddress())).to.equal(0n);
	});

	it("reverts notifyRewardAmount when underfunded", async function () {
		await expect(
			vault.connect(owner).notifyRewardAmount(DURATION),
		).to.be.revertedWithCustomError(vault, "RewardTooHigh");
	});

	it("restricts notifyRewardAmount to the owner", async function () {
		await usdc.mint(await vault.getAddress(), DURATION);
		await expect(
			vault.connect(stranger).notifyRewardAmount(DURATION),
		).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
	});

	it("never pays staked principal as rewards", async function () {
		await vault.connect(alice).stake(100n * ONE_USDC);
		// Only the staked principal is in the vault; no real reward budget exists.
		await expect(
			vault.connect(owner).notifyRewardAmount(DURATION),
		).to.be.revertedWithCustomError(vault, "RewardTooHigh");
	});

	it("blocks staking while paused but allows withdrawals", async function () {
		await vault.connect(alice).stake(10n * ONE_USDC);
		await vault.connect(owner).pause();
		await expect(vault.connect(alice).stake(ONE_USDC)).to.be.revertedWithCustomError(
			vault,
			"EnforcedPause",
		);
		await vault.connect(alice).withdraw(10n * ONE_USDC);
		expect(await vault.balanceOf(await alice.getAddress())).to.equal(0n);
	});

	it("blocks recovering the staking token", async function () {
		await expect(
			vault.connect(owner).recoverERC20(await usdc.getAddress(), 1n),
		).to.be.revertedWithCustomError(vault, "CannotRecoverStakingToken");
	});
});
