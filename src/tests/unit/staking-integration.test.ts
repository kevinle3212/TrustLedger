/**
 * @jest-environment node
 */
/**
 * USDC staking end-to-end integration test.
 *
 * Drives the *production* execution bridge ({@link toUsdcWriteRequests}) and on-chain reader
 * ({@link createUsdcStakeReader}) against a real local chain — a spawned Anvil node with a freshly
 * deployed `MockUSDC` + `StakingVault`. Nothing here is mocked beyond `@/lib/wagmi`'s ZERO_ADDRESS
 * constant (so the heavy Reown/WalletConnect ESM never loads): every balance read and every
 * stake/approve/claim/withdraw is a real transaction mined on chain through the same code the UI
 * runs. This is the missing link the unit suites cannot cover — that the planned writes' selectors
 * and args actually match the deployed vault, and that the viem reader decodes real state.
 *
 * The flow mirrors the wallet UI exactly: connect (wallet client) → approve → stake → refresh
 * balances → accrue → claim → unstake. It self-skips when Anvil or the Foundry build artifacts are
 * unavailable, so CI without a Foundry toolchain stays green.
 */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("@/lib/wagmi", () => ({
	ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
}));

import {
	createPublicClient,
	createTestClient,
	createWalletClient,
	defineChain,
	http,
	type Abi,
	type Address,
	type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type { StakeActionRequest } from "@/lib/staking/abstractions";
import { createUsdcStakeReader, toUsdcWriteRequests } from "@/lib/staking/execution";

// Anvil's first two deterministic dev accounts. Public, well-known test keys — never real funds.
// Public Anvil account #0 / #1 keys — documented dev fixtures, not secrets (gitleaks:allow).
const OWNER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const; // gitleaks:allow
const STAKER_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const; // gitleaks:allow

const PORT = 8546;
const RPC_URL = `http://127.0.0.1:${PORT.toString()}`;
const UNIT = 1_000_000n; // 1 USDC (6 decimals) in smallest units.

const CONTRACTS_OUT = join(__dirname, "..", "..", "..", "contracts", "out");
const USDC_ARTIFACT_PATH = join(CONTRACTS_OUT, "MockUSDC.sol", "MockUSDC.json");
const VAULT_ARTIFACT_PATH = join(CONTRACTS_OUT, "StakingVault.sol", "StakingVault.json");

interface Artifact {
	readonly abi: Abi;
	readonly bytecode: { readonly object: Hex };
}

function anvilAvailable(): boolean {
	try {
		return spawnSync("anvil", ["--version"], { stdio: "ignore" }).status === 0;
	} catch {
		return false;
	}
}

const READY = anvilAvailable() && existsSync(USDC_ARTIFACT_PATH) && existsSync(VAULT_ARTIFACT_PATH);

const anvilChain = defineChain({
	id: 31337,
	name: "anvil",
	nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
	rpcUrls: { default: { http: [RPC_URL] } },
});

async function waitForRpc(timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const res = await fetch(RPC_URL, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
			});
			if (res.ok) return;
		} catch {
			// node not up yet; keep polling.
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error("Anvil did not become ready in time");
}

// `describe.skip` keeps CI green where Anvil/Foundry artifacts are unavailable.
const describeMaybe = READY ? describe : describe.skip;

describeMaybe("USDC staking end-to-end (real chain)", () => {
	let anvil: ChildProcessWithoutNullStreams;
	let usdcArtifact: Artifact;
	let vaultArtifact: Artifact;

	const transport = http(RPC_URL);
	const owner = privateKeyToAccount(OWNER_KEY);
	const staker = privateKeyToAccount(STAKER_KEY);
	const publicClient = createPublicClient({ chain: anvilChain, transport });
	const testClient = createTestClient({ chain: anvilChain, transport, mode: "anvil" });
	const ownerWallet = createWalletClient({ account: owner, chain: anvilChain, transport });
	const stakerWallet = createWalletClient({ account: staker, chain: anvilChain, transport });

	let usdc: Address;
	let vault: Address;

	async function deploy(artifact: Artifact, args: readonly unknown[] = []): Promise<Address> {
		const hash = await ownerWallet.deployContract({
			abi: artifact.abi,
			bytecode: artifact.bytecode.object,
			args,
		});
		const receipt = await publicClient.waitForTransactionReceipt({ hash });
		const deployed = receipt.contractAddress;
		if (deployed === null || deployed === undefined) {
			throw new Error("deployment produced no address");
		}
		return deployed;
	}

	async function send(
		wallet: typeof ownerWallet,
		address: Address,
		abi: Abi,
		functionName: string,
		args: readonly unknown[],
	): Promise<void> {
		const hash = await wallet.writeContract({
			address,
			abi,
			functionName,
			args,
		});
		await publicClient.waitForTransactionReceipt({ hash });
	}

	// Runs a planned action through the production write bridge, exactly as the UI does.
	async function execPlan(plan: readonly StakeActionRequest[]): Promise<void> {
		const writes = toUsdcWriteRequests(plan, { vault, usdc });
		for (const write of writes) {
			// The discriminated UsdcWriteRequest is valid per branch; the cast only bridges
			// viem's heavily-overloaded writeContract parameter type (same as the UI panel).
			const request = write as Parameters<typeof stakerWallet.writeContract>[0];
			const hash = await stakerWallet.writeContract(request);
			await publicClient.waitForTransactionReceipt({ hash });
		}
	}

	beforeAll(async () => {
		usdcArtifact = JSON.parse(readFileSync(USDC_ARTIFACT_PATH, "utf8")) as Artifact;
		vaultArtifact = JSON.parse(readFileSync(VAULT_ARTIFACT_PATH, "utf8")) as Artifact;

		anvil = spawn("anvil", ["--port", PORT.toString(), "--silent"]);
		await waitForRpc(20_000);

		usdc = await deploy(usdcArtifact);
		vault = await deploy(vaultArtifact, [usdc, usdc, owner.address]);

		// Fund the staker with 100 USDC and seed the vault with a 1000 USDC reward pool.
		await send(ownerWallet, usdc, usdcArtifact.abi, "mint", [staker.address, 100n * UNIT]);
		await send(ownerWallet, usdc, usdcArtifact.abi, "mint", [vault, 1000n * UNIT]);
		await send(ownerWallet, vault, vaultArtifact.abi, "notifyRewardAmount", [1000n * UNIT]);
	}, 60_000);

	afterAll(() => {
		anvil.kill();
	});

	it("runs approve → stake → refresh → claim → unstake against the deployed vault", async () => {
		const reader = createUsdcStakeReader(publicClient, { vault, usdc });

		// Connect + initial balances: full wallet, nothing staked, nothing claimable.
		expect(await reader.walletBalance(staker.address)).toBe(100n * UNIT);
		expect(await reader.stakedBalance(staker.address)).toBe(0n);
		expect(await reader.claimableReward(staker.address)).toBe(0n);

		// Approve + stake 50 USDC through the production plan → write bridge.
		await execPlan([
			{ assetId: "USDC", kind: "approve", amount: 50n * UNIT },
			{ assetId: "USDC", kind: "stake", amount: 50n * UNIT },
		]);

		// Refresh balances from chain via the production reader.
		expect(await reader.stakedBalance(staker.address)).toBe(50n * UNIT);
		expect(await reader.walletBalance(staker.address)).toBe(50n * UNIT);

		// Accrue rewards by advancing the chain one day.
		await testClient.increaseTime({ seconds: 86_400 });
		await testClient.mine({ blocks: 1 });

		const claimable = await reader.claimableReward(staker.address);
		expect(claimable).toBeGreaterThan(0n);

		// Claim rewards: wallet balance must increase by at least the claimable amount.
		const beforeClaim = await reader.walletBalance(staker.address);
		await execPlan([{ assetId: "USDC", kind: "claim" }]);
		const afterClaim = await reader.walletBalance(staker.address);
		expect(afterClaim - beforeClaim).toBeGreaterThanOrEqual(claimable);

		// Unstake the full position: staked returns to zero, principal is back in the wallet.
		await execPlan([{ assetId: "USDC", kind: "unstake", amount: 50n * UNIT }]);
		expect(await reader.stakedBalance(staker.address)).toBe(0n);
		expect(await reader.walletBalance(staker.address)).toBeGreaterThanOrEqual(100n * UNIT);
	}, 120_000);
});
