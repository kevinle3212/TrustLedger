"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import { REPUTATION_REGISTRY_ABI } from "@/lib/abi";
import { REPUTATION_REGISTRY_ADDRESS } from "@/lib/wagmi";
import { formatAddress } from "@/lib/utils";

/** Formats cumulative averageRating as a 0–100 score and rating count. */
function formatReputation(
	numerator: bigint | undefined,
	denominator: bigint | undefined,
): { score: string; count: string } {
	if (numerator === undefined || denominator === undefined || denominator === 0n) {
		return { score: "—", count: "0" };
	}
	const avg = Number(numerator) / Number(denominator);
	return {
		score: avg.toFixed(1),
		count: denominator.toString(),
	};
}

function ReputationLookup({ lookupAddress }: { lookupAddress: `0x${string}` }): React.JSX.Element {
	const registryDeployed =
		REPUTATION_REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

	const { data, isLoading, isError } = useReadContract({
		address: REPUTATION_REGISTRY_ADDRESS,
		abi: REPUTATION_REGISTRY_ABI,
		functionName: "averageRating",
		args: [lookupAddress],
		query: { enabled: registryDeployed },
	});

	const [numerator, denominator] = data ?? [undefined, undefined];
	const { score, count } = formatReputation(numerator, denominator);

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
						{score !== "—" && (
							<span className="text-sm font-normal text-gray-500"> / 100</span>
						)}
					</span>

					<span className="text-gray-500">Ratings received</span>
					<span className="text-gray-900 dark:text-white">{count}</span>
				</div>
			)}

			<p className="text-xs text-gray-500">
				Scores are submitted by contract parties after completion (1–100). Dispute
				resolutions may apply automatic penalties. Juror stake reputation is separate — see
				the Juror page.
			</p>
		</div>
	);
}

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

			{lookupAddress !== undefined && <ReputationLookup lookupAddress={lookupAddress} />}
		</div>
	);
}
