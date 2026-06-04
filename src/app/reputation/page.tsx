"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, usePublicClient, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress, parseAbiItem } from "viem";
import { REPUTATION_REGISTRY_ABI } from "@/lib/abi";
import { REPUTATION_REGISTRY_ADDRESS, TRUSTLEDGER_ADDRESS } from "@/lib/wagmi";
import { formatAddress } from "@/lib/utils";
import type { ReputationHistoryEntry as HistoryEntry } from "@/types";

const RATED_EVENT = parseAbiItem("event Rated(address indexed user, uint8 indexed score)");
const RATING_SUBMITTED_EVENT = parseAbiItem(
	"event RatingSubmitted(uint256 indexed id, address indexed rater, uint8 score)",
);
const RECOVERY_EVENT = parseAbiItem(
	"event RecoveryAchieved(address indexed user, uint8 indexed bonus)",
);

// The reputation history feed entry shape is modelled by the shared
// `ReputationHistoryEntry` type (imported above as `HistoryEntry`) from `@/types`.

// averageRating() returns (numerator, denominator) rather than a pre-computed average.
// Storing the raw sum allows the contract to apply recovery bonuses (which add synthetic
// entries) without recomputing a running average — the caller divides to get the score.
// denominator is also the total rating count, which we surface in the UI.
function formatReputation(
	numerator: bigint | undefined,
	denominator: bigint | undefined,
): { score: string; count: string } {
	if (numerator === undefined || denominator === undefined || denominator === 0n) {
		return { score: "-", count: "0" };
	}
	return {
		score: (Number(numerator) / Number(denominator)).toFixed(1),
		count: denominator.toString(),
	};
}

// ─── Rating history feed ──────────────────────────────────────────────────────

function RatingHistoryFeed({ lookupAddress }: { lookupAddress: `0x${string}` }): React.JSX.Element {
	const publicClient = usePublicClient();
	const chainId = useChainId();
	const [entries, setEntries] = useState<HistoryEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [fetchError, setFetchError] = useState<string | null>(null);

	const explorerBase =
		chainId === 42161
			? "https://arbiscan.io"
			: chainId === 8453
				? "https://basescan.org"
				: chainId === 10
					? "https://optimistic.etherscan.io"
					: "https://sepolia.etherscan.io";

	useEffect(() => {
		if (publicClient === undefined) return;

		let cancelled = false;

		async function fetchHistory(): Promise<void> {
			if (publicClient === undefined) return;
			setLoading(true);
			setFetchError(null);
			setEntries([]);
			// Fetch Rated, RatingSubmitted, and RecoveryAchieved logs in parallel.
			// RatingSubmitted is not filtered by address — we join it with Rated by txHash
			// to recover the rater and contract ID for each received rating.
			const [ratedLogs, submittedLogs, recoveryLogs] = await Promise.all([
				publicClient.getLogs({
					address: REPUTATION_REGISTRY_ADDRESS,
					event: RATED_EVENT,
					args: { user: lookupAddress },
					fromBlock: 0n,
					toBlock: "latest",
				}),
				publicClient.getLogs({
					address: TRUSTLEDGER_ADDRESS,
					event: RATING_SUBMITTED_EVENT,
					fromBlock: 0n,
					toBlock: "latest",
				}),
				publicClient.getLogs({
					address: REPUTATION_REGISTRY_ADDRESS,
					event: RECOVERY_EVENT,
					args: { user: lookupAddress },
					fromBlock: 0n,
					toBlock: "latest",
				}),
			]);

			// Build txHash → RatingSubmitted so we can enrich each Rated log.
			const submittedByTx = new Map(submittedLogs.map((log) => [log.transactionHash, log]));

			const ratingEntries: HistoryEntry[] = ratedLogs.map((log) => {
				const submitted = submittedByTx.get(log.transactionHash);
				return {
					type: "rating",
					score: log.args.score ?? 0,
					blockNumber: log.blockNumber,
					txHash: log.transactionHash,
					rater: submitted?.args.rater ?? null,
					contractId: submitted?.args.id ?? null,
				};
			});

			const recoveryEntries: HistoryEntry[] = recoveryLogs.map((log) => ({
				type: "recovery",
				score: log.args.bonus ?? 0,
				blockNumber: log.blockNumber,
				txHash: log.transactionHash,
				rater: null,
				contractId: null,
			}));

			const all = [...ratingEntries, ...recoveryEntries].sort((a, b) =>
				Number(b.blockNumber - a.blockNumber),
			);

			if (!cancelled) {
				setEntries(all);
				setLoading(false);
			}
		}

		fetchHistory().catch((err: unknown) => {
			if (!cancelled) {
				setFetchError(
					err instanceof Error ? err.message : "Failed to load rating history.",
				);
				setLoading(false);
			}
		});

		return (): void => {
			cancelled = true;
		};
	}, [lookupAddress, publicClient]);

	if (loading) {
		return (
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
				<p className="text-sm text-gray-500">Loading rating history…</p>
			</div>
		);
	}

	if (fetchError !== null) {
		return (
			<div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-700 dark:text-yellow-300">
				Could not load history: {fetchError}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
				<p className="text-sm text-gray-500">No rating history found.</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3">
			<h2 className="font-semibold text-gray-900 dark:text-white">Rating History</h2>
			<div className="flex flex-col gap-2">
				{entries.map((entry) => (
					<div
						key={entry.txHash + entry.type}
						className="flex items-center justify-between gap-3 py-2 border-t border-gray-200 dark:border-white/10 first:border-t-0"
					>
						<div className="flex flex-col gap-0.5 min-w-0">
							{entry.type === "recovery" ? (
								<span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
									Recovery bonus +{entry.score}
								</span>
							) : (
								<span
									className={`text-sm font-semibold ${
										entry.score >= 70
											? "text-green-600 dark:text-green-400"
											: entry.score >= 40
												? "text-yellow-600 dark:text-yellow-400"
												: "text-red-600 dark:text-red-400"
									}`}
								>
									{entry.score} / 100
								</span>
							)}
							<div className="flex items-center gap-2 text-xs text-gray-500 truncate">
								{entry.rater !== null && (
									<span>from {formatAddress(entry.rater)}</span>
								)}
								{entry.contractId !== null && (
									<span className="font-mono">
										contract #{entry.contractId.toString()}
									</span>
								)}
								{entry.rater === null && entry.type === "rating" && (
									<span className="italic">auto-penalty</span>
								)}
							</div>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							<span className="text-xs text-gray-400 font-mono">
								block {entry.blockNumber.toString()}
							</span>
							<a
								href={`${explorerBase}/tx/${entry.txHash}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
							>
								tx ↗
							</a>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Average score + recovery status ─────────────────────────────────────────

function ReputationLookup({ lookupAddress }: { lookupAddress: `0x${string}` }): React.JSX.Element {
	const registryDeployed =
		REPUTATION_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

	const {
		data: avgData,
		isLoading,
		isError,
	} = useReadContract({
		address: REPUTATION_REGISTRY_ADDRESS,
		abi: REPUTATION_REGISTRY_ABI,
		functionName: "averageRating",
		args: [lookupAddress],
		query: { enabled: registryDeployed },
	});

	const { data: recoveryData } = useReadContract({
		address: REPUTATION_REGISTRY_ADDRESS,
		abi: REPUTATION_REGISTRY_ABI,
		functionName: "recoveryStatus",
		args: [lookupAddress],
		query: { enabled: registryDeployed },
	});

	const [numerator, denominator] = avgData ?? [undefined, undefined];
	const { score, count } = formatReputation(numerator, denominator);
	const [pending, progress] = recoveryData ?? [undefined, undefined];
	const inRecovery = pending !== undefined && pending > 0n;

	if (!registryDeployed) {
		return (
			<div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-700 dark:text-yellow-300">
				ReputationRegistry is not configured. Deploy locally with{" "}
				<code className="font-mono text-xs">npm run hardhat:deploy:local</code> and restart
				the dev server.
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">On-chain Reputation</h2>
				<span className="text-xs text-gray-500 font-mono">
					{formatAddress(lookupAddress)}
				</span>
			</div>

			{isLoading && <p className="text-sm text-gray-500">Loading…</p>}
			{isError && (
				<p className="text-sm text-red-500 dark:text-red-400">
					Failed to read reputation. Check that you are on the correct network.
				</p>
			)}
			{!isLoading && !isError && (
				<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
					<span className="text-gray-500">Average score</span>
					<span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
						{score}
						{score !== "-" && (
							<span className="text-sm font-normal text-gray-500"> / 100</span>
						)}
					</span>

					<span className="text-gray-500">Ratings received</span>
					<span className="text-gray-900 dark:text-white">{count}</span>

					{inRecovery && (
						<>
							<span className="text-gray-500">Recovery progress</span>
							<span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
								{progress.toString()} / 3 toward clearing {pending.toString()} low
								rating{pending === 1n ? "" : "s"}
							</span>
						</>
					)}
				</div>
			)}

			<p className="text-xs text-gray-500">
				Scores are submitted by contract parties after completion (1–100). Dispute
				resolutions may apply automatic penalties. Receiving 3 scores ≥ 70 after a low score
				(≤ 30) earns a +50 recovery bonus.
			</p>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReputationPage(): React.JSX.Element {
	const { address, isConnected } = useAccount();
	const [input, setInput] = useState("");
	const [lookupAddress, setLookupAddress] = useState<`0x${string}` | undefined>(undefined);
	const [inputError, setInputError] = useState<string | undefined>(undefined);

	function handleLookup(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		const trimmed = input.trim();
		if (!isAddress(trimmed)) {
			setInputError("Enter a valid Ethereum address (0x…).");
			setLookupAddress(undefined);
			return;
		}
		setInputError(undefined);
		setLookupAddress(trimmed);
	}

	function lookupSelf(): void {
		if (address === undefined) return;
		setInput(address);
		setInputError(undefined);
		setLookupAddress(address);
	}

	return (
		<div className="max-w-lg mx-auto px-6 py-12 flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold">Reputation</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
					Look up cumulative escrow ratings from completed TrustLedger contracts.
				</p>
			</div>

			<form
				onSubmit={handleLookup}
				className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3"
			>
				<label className="text-sm font-medium text-gray-900 dark:text-white">
					Wallet address
				</label>
				<input
					type="text"
					placeholder="0x…"
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
					}}
					className="rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
				/>
				{inputError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{inputError}</p>
				)}
				<div className="flex gap-2 flex-wrap">
					<button
						type="submit"
						className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
					>
						Look up
					</button>
					{isConnected && address !== undefined && (
						<button
							type="button"
							onClick={lookupSelf}
							className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
						>
							Use my wallet
						</button>
					)}
				</div>
			</form>

			{!isConnected && (
				<div className="flex items-center gap-3 text-sm text-gray-500">
					<ConnectButton />
					<span>Connect to look up your own address quickly.</span>
				</div>
			)}

			{lookupAddress !== undefined && (
				<>
					<ReputationLookup lookupAddress={lookupAddress} />
					<RatingHistoryFeed lookupAddress={lookupAddress} />
				</>
			)}
		</div>
	);
}
