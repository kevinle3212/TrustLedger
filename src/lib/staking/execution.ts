/**
 * USDC staking execution bridge.
 *
 * This is the missing activation layer between the pure adapter plan and the chain. An adapter's
 * {@link StakeAdapter.planAction} yields normalized {@link StakeActionRequest}s; this module turns
 * the USDC plan into concrete, strongly-typed EVM contract writes (consumed by wagmi's
 * `writeContractAsync` in the UI) and exposes a viem-backed {@link StakeReader} for runtime
 * balance/reward reads. ETH keeps its existing dedicated `JurorRegistry` flow; SOL has no execution
 * path here because the app ships no Solana signer for staking, so its adapter stays disabled.
 *
 * Safety: every write is gated on a non-zero, fully configured vault + token address pair. A
 * disabled or unconfigured USDC asset can never reach this module — `planAction` returns no
 * requests — and {@link assertUsdcConfigured} is a hard backstop against a zero-address write.
 */
import type { PublicClient } from "viem";

import { ERC20_ABI, STAKING_VAULT_ABI } from "@/lib/abi";
import { ZERO_ADDRESS } from "@/lib/wagmi";

import type { StakeActionRequest } from "./abstractions";
import type { StakeReader } from "./adapters/shared";

/** Deployed USDC staking addresses on the connected chain. Both must be non-zero to execute. */
export interface UsdcStakeAddresses {
	readonly vault: `0x${string}`;
	readonly usdc: `0x${string}`;
}

/**
 * A concrete, strongly-typed USDC staking contract write. The discriminated `abi`/`functionName`
 * pairing keeps wagmi's `writeContractAsync` fully type-checked at the call site.
 */
export type UsdcWriteRequest =
	| {
			readonly address: `0x${string}`;
			readonly abi: typeof ERC20_ABI;
			readonly functionName: "approve";
			readonly args: readonly [`0x${string}`, bigint];
	  }
	| {
			readonly address: `0x${string}`;
			readonly abi: typeof STAKING_VAULT_ABI;
			readonly functionName: "stake" | "withdraw";
			readonly args: readonly [bigint];
	  }
	| {
			readonly address: `0x${string}`;
			readonly abi: typeof STAKING_VAULT_ABI;
			readonly functionName: "getReward";
			readonly args: readonly [];
	  };

/** Throws when either USDC staking address is missing or the zero-address placeholder. */
export function assertUsdcConfigured(addresses: UsdcStakeAddresses): void {
	if (addresses.vault === ZERO_ADDRESS || addresses.usdc === ZERO_ADDRESS) {
		throw new Error("USDC staking is not configured on this network");
	}
}

/** Maps one planned USDC action to its contract write, asserting the amount is present when needed. */
function toUsdcWriteRequest(
	request: StakeActionRequest,
	addresses: UsdcStakeAddresses,
): UsdcWriteRequest {
	const { vault, usdc } = addresses;
	switch (request.kind) {
		case "approve": {
			if (request.amount === undefined) throw new Error("approve requires an amount");
			return {
				address: usdc,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [vault, request.amount],
			};
		}
		case "stake": {
			if (request.amount === undefined) throw new Error("stake requires an amount");
			return {
				address: vault,
				abi: STAKING_VAULT_ABI,
				functionName: "stake",
				args: [request.amount],
			};
		}
		case "unstake": {
			if (request.amount === undefined) throw new Error("unstake requires an amount");
			return {
				address: vault,
				abi: STAKING_VAULT_ABI,
				functionName: "withdraw",
				args: [request.amount],
			};
		}
		case "claim":
			return { address: vault, abi: STAKING_VAULT_ABI, functionName: "getReward", args: [] };
	}
}

/**
 * Translates a full USDC adapter plan into ordered contract writes (e.g. approve → stake). Returns
 * an empty array for an empty plan, so a disabled asset (no planned actions) executes nothing.
 */
export function toUsdcWriteRequests(
	plan: readonly StakeActionRequest[],
	addresses: UsdcStakeAddresses,
): UsdcWriteRequest[] {
	if (plan.length === 0) return [];
	assertUsdcConfigured(addresses);
	return plan.map((request) => toUsdcWriteRequest(request, addresses));
}

/**
 * Minimal runtime {@link StakeReader} for USDC over viem: wallet balance from the ERC-20 token,
 * staked balance and claimable reward from the `StakingVault`. Wired into the adapter so the UI's
 * balance panel reads real on-chain state instead of a preview placeholder.
 */
export function createUsdcStakeReader(
	client: PublicClient,
	addresses: UsdcStakeAddresses,
): StakeReader {
	const account = (raw: string): `0x${string}` => raw as `0x${string}`;
	return {
		walletBalance: async (raw) =>
			await client.readContract({
				address: addresses.usdc,
				abi: ERC20_ABI,
				functionName: "balanceOf",
				args: [account(raw)],
			}),
		stakedBalance: async (raw) =>
			await client.readContract({
				address: addresses.vault,
				abi: STAKING_VAULT_ABI,
				functionName: "balanceOf",
				args: [account(raw)],
			}),
		claimableReward: async (raw) =>
			await client.readContract({
				address: addresses.vault,
				abi: STAKING_VAULT_ABI,
				functionName: "earned",
				args: [account(raw)],
			}),
	};
}
