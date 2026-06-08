"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount, useChainId, usePublicClient, useReadContract } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { isAddress, parseAbiItem } from "viem";
import { REPUTATION_REGISTRY_ABI, TRUSTLEDGER_ABI } from "@/lib/abi";
import {
	getConfiguredDeploymentNetworkNames,
	getContractDeployment,
	getNetworkName,
	ZERO_ADDRESS,
} from "@/lib/wagmi";
import { formatAddress } from "@/lib/utils";
import { validateEthAddress } from "@/lib/validation";
import type { ReputationHistoryEntry as HistoryEntry } from "@/types";

const RATED_EVENT = parseAbiItem("event Rated(address indexed user, uint8 indexed score)");
const RATING_SUBMITTED_EVENT = parseAbiItem(
	"event RatingSubmitted(uint256 indexed id, address indexed rater, uint8 score)",
);
const RECOVERY_EVENT = parseAbiItem(
	"event RecoveryAchieved(address indexed user, uint8 indexed bonus)",
);
const MAX_LOG_BLOCK_RANGE = 49_999n;

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

async function findDeploymentBlock(
	publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
	address: `0x${string}`,
	latestBlock: bigint,
): Promise<bigint | undefined> {
	const latestCode = await publicClient.getCode({ address, blockNumber: latestBlock });
	if (latestCode === undefined || latestCode === "0x") return undefined;

	let low = 0n;
	let high = latestBlock;
	while (low < high) {
		const mid = (low + high) / 2n;
		const code = await publicClient.getCode({ address, blockNumber: mid });
		if (code !== undefined && code !== "0x") {
			high = mid;
		} else {
			low = mid + 1n;
		}
	}

	return low;
}

// ─── Rating history feed ──────────────────────────────────────────────────────

function RatingHistoryFeed({
	lookupAddress,
	registryAddress,
	trustLedgerAddress,
	deployBlock,
}: {
	lookupAddress: `0x${string}`;
	registryAddress: `0x${string}`;
	trustLedgerAddress: `0x${string}`;
	deployBlock: bigint | undefined;
}): React.JSX.Element {
	const t = useTranslations("Reputation");
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

			const latestBlock = await publicClient.getBlockNumber();
			const discoveredDeployBlock =
				deployBlock ??
				(await findDeploymentBlock(publicClient, registryAddress, latestBlock));
			const firstBlock =
				discoveredDeployBlock ??
				(latestBlock > MAX_LOG_BLOCK_RANGE ? latestBlock - MAX_LOG_BLOCK_RANGE : 0n);

			async function getLogsInChunks<TLog>(
				getLogsForRange: (fromBlock: bigint, toBlock: bigint) => Promise<TLog[]>,
			): Promise<TLog[]> {
				const logs: TLog[] = [];
				for (let fromBlock = firstBlock; fromBlock <= latestBlock; ) {
					const toBlock =
						fromBlock + MAX_LOG_BLOCK_RANGE > latestBlock
							? latestBlock
							: fromBlock + MAX_LOG_BLOCK_RANGE;
					logs.push(...(await getLogsForRange(fromBlock, toBlock)));
					fromBlock = toBlock + 1n;
				}
				return logs;
			}

			// Fetch Rated, RatingSubmitted, and RecoveryAchieved logs in parallel.
			// RatingSubmitted is not filtered by address — we join it with Rated by txHash
			// to recover the rater and contract ID for each received rating.
			const [ratedLogs, submittedLogs, recoveryLogs] = await Promise.all([
				getLogsInChunks(
					async (fromBlock, toBlock) =>
						await publicClient.getLogs({
							address: registryAddress,
							event: RATED_EVENT,
							args: { user: lookupAddress },
							fromBlock,
							toBlock,
						}),
				),
				getLogsInChunks(
					async (fromBlock, toBlock) =>
						await publicClient.getLogs({
							address: trustLedgerAddress,
							event: RATING_SUBMITTED_EVENT,
							fromBlock,
							toBlock,
						}),
				),
				getLogsInChunks(
					async (fromBlock, toBlock) =>
						await publicClient.getLogs({
							address: registryAddress,
							event: RECOVERY_EVENT,
							args: { user: lookupAddress },
							fromBlock,
							toBlock,
						}),
				),
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
				setFetchError(err instanceof Error ? err.message : t("historyLoadFailed"));
				setLoading(false);
			}
		});

		return (): void => {
			cancelled = true;
		};
	}, [deployBlock, lookupAddress, publicClient, registryAddress, t, trustLedgerAddress]);

	if (loading) {
		return (
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
				<p className="text-sm text-gray-500">{t("loadingHistory")}</p>
			</div>
		);
	}

	if (fetchError !== null) {
		return (
			<div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-700 dark:text-yellow-300">
				{t("couldNotLoad", { error: fetchError })}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
				<p className="text-sm text-gray-500">{t("noHistory")}</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3">
			<h2 className="font-semibold text-gray-900 dark:text-white">{t("ratingHistory")}</h2>
			<div className="flex flex-col gap-2">
				{entries.map((entry) => (
					<div
						key={entry.txHash + entry.type}
						className="flex flex-col gap-2 border-t border-gray-200 py-2 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:border-white/10"
					>
						<div className="flex flex-col gap-0.5 min-w-0">
							{entry.type === "recovery" ? (
								<span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
									{t("recoveryBonus", { score: entry.score })}
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
									<span>
										{t("from", { address: formatAddress(entry.rater) })}
									</span>
								)}
								{entry.contractId !== null && (
									<span className="font-mono">
										{t("contractNum", { id: entry.contractId.toString() })}
									</span>
								)}
								{entry.rater === null && entry.type === "rating" && (
									<span className="italic">{t("autoPenalty")}</span>
								)}
							</div>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							<span className="text-xs text-gray-400 font-mono">
								{t("block", { n: entry.blockNumber.toString() })}
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

function ReputationLookup({
	lookupAddress,
	registryAddress,
	registryLookupError,
	registryLookupLoading,
	trustLedgerDeployed,
	trustLedgerAddress,
	networkName,
	configuredNetworkNames,
}: {
	lookupAddress: `0x${string}`;
	registryAddress: `0x${string}` | undefined;
	registryLookupError: boolean;
	registryLookupLoading: boolean;
	trustLedgerDeployed: boolean;
	trustLedgerAddress: `0x${string}`;
	networkName: string;
	configuredNetworkNames: string[];
}): React.JSX.Element {
	const t = useTranslations("Reputation");
	const registryAvailable = registryAddress !== undefined && registryAddress !== ZERO_ADDRESS;

	const {
		data: avgData,
		isLoading,
		isError,
	} = useReadContract({
		address: registryAddress ?? ZERO_ADDRESS,
		abi: REPUTATION_REGISTRY_ABI,
		functionName: "averageRating",
		args: [lookupAddress],
		query: { enabled: registryAvailable },
	});

	const { data: recoveryData } = useReadContract({
		address: registryAddress ?? ZERO_ADDRESS,
		abi: REPUTATION_REGISTRY_ABI,
		functionName: "recoveryStatus",
		args: [lookupAddress],
		query: { enabled: registryAvailable },
	});

	const [numerator, denominator] = avgData ?? [undefined, undefined];
	const { score, count } = formatReputation(numerator, denominator);
	const [pending, progress] = recoveryData ?? [undefined, undefined];
	const inRecovery = pending !== undefined && pending > 0n;

	if (!trustLedgerDeployed) {
		const message =
			configuredNetworkNames.length > 0
				? t("trustLedgerNotConfiguredWithHint", {
						network: networkName,
						networks: configuredNetworkNames.join(", "),
					})
				: t("trustLedgerNotConfiguredNoHint", { network: networkName });
		return (
			<div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-700 dark:text-yellow-300">
				{message}
			</div>
		);
	}

	if (registryLookupLoading) {
		return (
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5">
				<p className="text-sm text-gray-500">{t("findingRegistry")}</p>
			</div>
		);
	}

	if (registryLookupError) {
		return (
			<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-300">
				{t("registryLookupError")}
			</div>
		);
	}

	if (!registryAvailable) {
		return (
			<div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-700 dark:text-yellow-300">
				{t("registryNotConfigured")}
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">
					{t("onChainReputation")}
				</h2>
				<div className="flex min-w-0 flex-col gap-0.5 sm:items-end">
					<span className="text-xs text-gray-500 font-mono">
						{formatAddress(lookupAddress)}
					</span>
					<span className="text-[11px] text-gray-400 font-mono">
						{t("registryLabel", { address: formatAddress(registryAddress) })}
					</span>
					<span className="sr-only">TrustLedger {trustLedgerAddress}</span>
				</div>
			</div>

			{isLoading && <p className="text-sm text-gray-500">{t("loading")}</p>}
			{isError && (
				<p className="text-sm text-red-500 dark:text-red-400">{t("failedToRead")}</p>
			)}
			{!isLoading && !isError && (
				<div className="tl-kv-grid text-sm">
					<span className="text-gray-500">{t("averageScore")}</span>
					<span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
						{score}
						{score !== "-" && (
							<span className="text-sm font-normal text-gray-500"> / 100</span>
						)}
					</span>

					<span className="text-gray-500">{t("ratingsReceived")}</span>
					<span className="text-gray-900 dark:text-white">{count}</span>

					{inRecovery && (
						<>
							<span className="text-gray-500">{t("recoveryProgress")}</span>
							<span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
								{t("recoveryProgressValue", {
									progress: progress.toString(),
									pending: Number(pending),
								})}
							</span>
						</>
					)}
				</div>
			)}

			<p className="text-xs text-gray-500">{t("scoresNote")}</p>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ReputationPageInner(): React.JSX.Element {
	const t = useTranslations("Reputation");
	const { address, isConnected } = useAccount();
	const chainId = useChainId();
	const [input, setInput] = useState("");
	const [lookupAddress, setLookupAddress] = useState<`0x${string}` | undefined>(undefined);
	const [inputError, setInputError] = useState<string | undefined>(undefined);
	const deployment = getContractDeployment(chainId);
	const networkName = getNetworkName(chainId);
	const configuredNetworkNames = getConfiguredDeploymentNetworkNames();
	const trustLedgerAddress = deployment.trustLedger;
	const configuredRegistryAddress = deployment.reputationRegistry;
	const trustLedgerDeployed = trustLedgerAddress !== ZERO_ADDRESS;
	const shouldDiscoverRegistry =
		trustLedgerDeployed && configuredRegistryAddress === ZERO_ADDRESS;

	const {
		data: discoveredRegistryAddress,
		isLoading: registryLookupLoading,
		isError: registryLookupError,
	} = useReadContract({
		address: trustLedgerAddress,
		abi: TRUSTLEDGER_ABI,
		functionName: "reputationRegistry",
		query: { enabled: shouldDiscoverRegistry },
	});

	const registryAddress =
		configuredRegistryAddress !== ZERO_ADDRESS
			? configuredRegistryAddress
			: discoveredRegistryAddress;
	const registryAvailable = registryAddress !== undefined && registryAddress !== ZERO_ADDRESS;

	function handleLookup(e: React.SyntheticEvent<HTMLFormElement>): void {
		e.preventDefault();
		const trimmed = input.trim();
		const error = validateEthAddress(trimmed);
		if (error !== undefined) {
			setInputError(error);
			setLookupAddress(undefined);
			return;
		}
		// validateEthAddress guarantees a valid address here; narrow the type.
		if (!isAddress(trimmed)) return;
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
				<h1 className="text-3xl font-bold">{t("title")}</h1>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t("subtitle")}</p>
			</div>

			<form
				onSubmit={handleLookup}
				className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-5 flex flex-col gap-3"
			>
				<label
					htmlFor="rep-lookup-address"
					className="text-sm font-medium text-gray-900 dark:text-white"
				>
					{t("walletAddress")}
				</label>
				<input
					id="rep-lookup-address"
					type="text"
					placeholder="0x…"
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
					}}
					aria-invalid={inputError !== undefined}
					className={`rounded-lg bg-white dark:bg-white/5 border px-3 py-2 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
						inputError !== undefined
							? "border-red-500 dark:border-red-500 focus:ring-red-500"
							: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
					}`}
				/>
				{inputError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{inputError}</p>
				)}
				<div className="flex gap-2 flex-wrap">
					<button
						type="submit"
						className="px-4 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
					>
						{t("lookUp")}
					</button>
					{isConnected && address !== undefined && (
						<button
							type="button"
							onClick={lookupSelf}
							className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
						>
							{t("useMyWallet")}
						</button>
					)}
				</div>
			</form>

			{!isConnected && (
				<div className="flex items-center gap-3 text-sm text-gray-500">
					<ConnectButton />
					<span>{t("connectToLookUp")}</span>
				</div>
			)}

			{lookupAddress !== undefined && (
				<>
					<ReputationLookup
						lookupAddress={lookupAddress}
						registryAddress={registryAddress}
						registryLookupError={registryLookupError}
						registryLookupLoading={registryLookupLoading}
						trustLedgerDeployed={trustLedgerDeployed}
						trustLedgerAddress={trustLedgerAddress}
						networkName={networkName}
						configuredNetworkNames={configuredNetworkNames}
					/>
					{registryAvailable && trustLedgerDeployed && (
						<RatingHistoryFeed
							lookupAddress={lookupAddress}
							registryAddress={registryAddress}
							trustLedgerAddress={trustLedgerAddress}
							deployBlock={deployment.deployBlock}
						/>
					)}
				</>
			)}
		</div>
	);
}
