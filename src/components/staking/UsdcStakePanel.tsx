"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useChainId, useConfig, usePublicClient, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useTranslations } from "next-intl";

import { getStakeAdapter } from "@/lib/staking/adapters";
import { createUsdcStakeReader, toUsdcWriteRequests } from "@/lib/staking/execution";
import {
	formatAssetAmount,
	STAKE_ASSETS,
	validateStakeAmount,
	type StakeAmountError,
} from "@/lib/staking/assets";
import type { StakeActionKind, StakeBalance, StakeReward } from "@/lib/staking/abstractions";
import { getStakingVaultAddress, getUsdcAddress } from "@/lib/wagmi";

const USDC = STAKE_ASSETS.USDC;

/** Consolidated panel state: on-chain reads plus the in-flight transaction lifecycle. */
interface PanelState {
	readonly balance: StakeBalance | null;
	readonly reward: StakeReward | null;
	readonly busy: StakeActionKind | undefined;
	readonly error: string | undefined;
	readonly confirmed: boolean;
	/** Bumped after a confirmed transaction to re-trigger the balance read effect. */
	readonly refreshNonce: number;
}

type PanelAction =
	| {
			readonly type: "reads";
			readonly balance: StakeBalance | null;
			readonly reward: StakeReward | null;
	  }
	| { readonly type: "start"; readonly kind: StakeActionKind }
	| { readonly type: "success" }
	| { readonly type: "error"; readonly message: string };

const INITIAL_STATE: PanelState = {
	balance: null,
	reward: null,
	busy: undefined,
	error: undefined,
	confirmed: false,
	refreshNonce: 0,
};

function panelReducer(state: PanelState, action: PanelAction): PanelState {
	switch (action.type) {
		case "reads":
			return { ...state, balance: action.balance, reward: action.reward };
		case "start":
			return { ...state, busy: action.kind, error: undefined, confirmed: false };
		case "success":
			return {
				...state,
				busy: undefined,
				confirmed: true,
				refreshNonce: state.refreshNonce + 1,
			};
		case "error":
			return { ...state, busy: undefined, error: action.message };
	}
}

/**
 * Live USDC staking panel. Wires the USDC adapter into the chain: reads wallet/staked/reward
 * balances through a viem-backed {@link createUsdcStakeReader}, and executes stake/unstake/claim by
 * running `adapter.planAction(...)` through {@link toUsdcWriteRequests} and submitting each write
 * with wagmi. Only mounted when USDC staking is configured for the connected chain, so it never
 * presents a disabled or zero-address action.
 */
export function UsdcStakePanel({ account }: { account: `0x${string}` }): React.JSX.Element {
	const t = useTranslations("Juror");
	const chainId = useChainId();
	const config = useConfig();
	const publicClient = usePublicClient();
	const { writeContractAsync } = useWriteContract();

	const addresses = useMemo(() => {
		const vault = getStakingVaultAddress(chainId);
		const usdc = getUsdcAddress(chainId);
		return vault !== undefined && usdc !== undefined ? { vault, usdc } : undefined;
	}, [chainId]);

	// Adapter wired with the runtime viem reader so its read path returns real on-chain state.
	const adapter = useMemo(() => {
		const reader =
			publicClient !== undefined && addresses !== undefined
				? createUsdcStakeReader(publicClient, addresses)
				: undefined;
		return getStakeAdapter("USDC", { chainId }, reader);
	}, [publicClient, addresses, chainId]);

	const [state, dispatch] = useReducer(panelReducer, INITIAL_STATE);
	const { balance, reward, busy, error, confirmed } = state;

	const [stakeInput, setStakeInput] = useState("");
	const [unstakeInput, setUnstakeInput] = useState("");

	useEffect(() => {
		let active = true;
		void Promise.all([adapter.readBalance(account), adapter.readReward(account)]).then(
			([nextBalance, nextReward]) => {
				if (!active) return;
				dispatch({ type: "reads", balance: nextBalance, reward: nextReward });
			},
		);
		return (): void => {
			active = false;
		};
	}, [adapter, account, state.refreshNonce]);

	const amountErrorLabel = useCallback(
		(code: StakeAmountError): string =>
			code === "insufficient-balance" ? t("insufficientBalance") : t("invalidAmount"),
		[t],
	);

	const run = useCallback(
		async (kind: StakeActionKind, amount?: bigint): Promise<void> => {
			if (addresses === undefined) return;
			dispatch({ type: "start", kind });
			try {
				const plan = adapter.planAction(
					amount === undefined
						? { assetId: "USDC", kind }
						: { assetId: "USDC", kind, amount },
				);
				const writes = toUsdcWriteRequests(plan, addresses);
				for (const write of writes) {
					// The discriminated UsdcWriteRequest is a valid write per branch; the cast only
					// bridges wagmi's heavily-overloaded `writeContractAsync` parameter type.
					// react-doctor-disable-next-line react-doctor/async-await-in-loop -- Writes are an ordered, dependent sequence (approve must be mined before stake); they cannot run in parallel.
					const hash = await writeContractAsync(
						write as Parameters<typeof writeContractAsync>[0],
					);
					// react-doctor-disable-next-line react-doctor/async-await-in-loop -- Receipt must be awaited before the next dependent write is submitted.
					await waitForTransactionReceipt(config, { hash });
				}
				setStakeInput("");
				setUnstakeInput("");
				dispatch({ type: "success" });
			} catch (cause) {
				const message =
					(cause as { shortMessage?: string }).shortMessage ??
					(cause instanceof Error ? cause.message : String(cause));
				dispatch({ type: "error", message });
			}
		},
		[addresses, adapter, writeContractAsync, config],
	);

	function handleStake(event: React.SyntheticEvent<HTMLFormElement>): void {
		event.preventDefault();
		const result = validateStakeAmount(
			stakeInput,
			USDC,
			balance === null ? {} : { balance: balance.wallet },
		);
		if (!result.ok) {
			dispatch({ type: "error", message: amountErrorLabel(result.error) });
			return;
		}
		void run("stake", result.value);
	}

	function handleUnstake(event: React.SyntheticEvent<HTMLFormElement>): void {
		event.preventDefault();
		const result = validateStakeAmount(
			unstakeInput,
			USDC,
			balance === null ? {} : { balance: balance.staked },
		);
		if (!result.ok) {
			dispatch({ type: "error", message: amountErrorLabel(result.error) });
			return;
		}
		void run("unstake", result.value);
	}

	const inputClass =
		"w-36 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-5">
			<div>
				<h2 className="font-semibold text-gray-900 dark:text-white">
					{t("usdcStakeTitle")}
				</h2>
				<p className="text-xs text-gray-500 mt-1">{t("usdcStakeSubtitle")}</p>
			</div>

			<div className="tl-kv-grid text-sm">
				<span className="text-gray-500">{t("walletBalanceLabel")}</span>
				<span className="text-gray-900 dark:text-white">
					{balance !== null ? formatAssetAmount(balance.wallet, USDC.decimals) : "-"} USDC
				</span>
				<span className="text-gray-500">{t("stakedBalanceLabel")}</span>
				<span className="text-gray-900 dark:text-white">
					{balance !== null ? formatAssetAmount(balance.staked, USDC.decimals) : "-"} USDC
				</span>
				<span className="text-gray-500">{t("claimableLabel")}</span>
				<span className="text-gray-900 dark:text-white">
					{reward !== null ? formatAssetAmount(reward.claimable, USDC.decimals) : "-"}{" "}
					USDC
				</span>
			</div>

			<form onSubmit={handleStake} className="flex flex-col gap-2">
				<label htmlFor="usdc-stake-amount" className="text-xs text-gray-500">
					{t("stakeAmountLabel")}
				</label>
				<div className="flex gap-2 items-center">
					<input
						id="usdc-stake-amount"
						type="number"
						min="0"
						step="0.000001"
						value={stakeInput}
						onChange={(e) => {
							setStakeInput(e.target.value);
						}}
						className={inputClass}
					/>
					<span className="text-sm text-gray-500 dark:text-gray-400">USDC</span>
					<button
						type="submit"
						disabled={busy !== undefined}
						className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium transition-colors"
					>
						{busy === "stake" ? t("txProcessing") : t("stake")}
					</button>
				</div>
			</form>

			<form onSubmit={handleUnstake} className="flex flex-col gap-2">
				<label htmlFor="usdc-unstake-amount" className="text-xs text-gray-500">
					{balance !== null
						? t("withdrawStakeMax", {
								amount: formatAssetAmount(balance.staked, USDC.decimals),
							})
						: t("withdrawStake")}
				</label>
				<div className="flex gap-2 items-center">
					<input
						id="usdc-unstake-amount"
						type="number"
						min="0"
						step="0.000001"
						value={unstakeInput}
						onChange={(e) => {
							setUnstakeInput(e.target.value);
						}}
						className={inputClass}
					/>
					<span className="text-sm text-gray-500 dark:text-gray-400">USDC</span>
					<button
						type="submit"
						disabled={busy !== undefined}
						className="px-3 py-1.5 text-xs rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-medium transition-colors"
					>
						{busy === "unstake" ? t("txProcessing") : t("unstake")}
					</button>
				</div>
			</form>

			<button
				type="button"
				onClick={() => void run("claim")}
				disabled={busy !== undefined || (reward?.claimable ?? 0n) === 0n}
				className="self-start px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium transition-colors"
			>
				{busy === "claim" ? t("txProcessing") : t("claimRewards")}
			</button>

			{confirmed && (
				<p className="text-xs text-green-700 dark:text-green-400">{t("txConfirmed")}</p>
			)}
			{error !== undefined && (
				<p className="text-xs text-red-500 dark:text-red-400">{error}</p>
			)}
		</div>
	);
}
