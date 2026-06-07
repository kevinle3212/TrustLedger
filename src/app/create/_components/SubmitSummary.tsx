"use client";

interface Props {
	amount: string;
	/** Payment token type. */
	token: "eth" | "usdc";
	estimatedDurationDays: string;
	bufferFactor: string;
	holdBack: "none" | "5" | "10" | "15";
	simError: Error | null;
	/** Simulation pipeline stage. */
	simStatus: "idle" | "loading" | "ready";
	writeError: Error | null;
	/** Wallet/chain transaction lifecycle stage. */
	txStatus: "idle" | "pending" | "confirming";
	hasBlockingErrors: boolean;
	/** Proposer's role in the contract. */
	proposerRole: "freelancer" | "client";
}

/** Summary card, simulation/write errors, and the submit button. */
export function SubmitSummary({
	amount,
	token,
	estimatedDurationDays,
	bufferFactor,
	holdBack,
	simError,
	simStatus,
	writeError,
	txStatus,
	hasBlockingErrors,
	proposerRole,
}: Props): React.JSX.Element {
	const isUsdc = token === "usdc";
	const isClientProposing = proposerRole === "client";
	return (
		<>
			{amount !== "" && (
				<div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm text-indigo-900 dark:text-indigo-100 flex flex-col gap-1">
					<p>
						<span className="text-indigo-700 dark:text-indigo-300">Escrow amount:</span>{" "}
						<span className="text-gray-900 dark:text-white font-medium">
							{amount} {isUsdc ? "USDC" : "ETH"}
						</span>
					</p>
					{isUsdc && (
						<p className="text-xs text-amber-600 dark:text-amber-400">
							You will need to approve the escrow contract to spend your USDC before
							funding.
						</p>
					)}
					<p>
						<span className="text-gray-500 dark:text-gray-400">Deadline:</span>{" "}
						<span className="text-gray-900 dark:text-white font-medium">
							~
							{Math.round(
								(Number(estimatedDurationDays) * Number(bufferFactor)) / 1000,
							)}{" "}
							days from now
						</span>
					</p>
					{holdBack !== "none" && (
						<p>
							<span className="text-gray-500 dark:text-gray-400">Hold-back:</span>{" "}
							<span className="text-gray-900 dark:text-white font-medium">
								{holdBack}% (
								{((Number(amount) * Number(holdBack)) / 100).toFixed(
									isUsdc ? 2 : 6,
								)}{" "}
								{isUsdc ? "USDC" : "ETH"})
							</span>
						</p>
					)}
				</div>
			)}

			{/* Simulation error - shown before MetaMask opens, surfaces revert reason. */}
			{simError !== null && simStatus !== "idle" && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
					{(simError as { shortMessage?: string }).shortMessage ?? simError.message}
				</p>
			)}

			{writeError !== null && (
				<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
					{(writeError as { shortMessage?: string }).shortMessage ?? writeError.message}
				</p>
			)}

			<button
				type="submit"
				disabled={
					txStatus !== "idle" ||
					hasBlockingErrors ||
					(simStatus === "loading" && simError === null)
				}
				className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
			>
				{txStatus === "pending"
					? "Waiting for wallet…"
					: txStatus === "confirming"
						? "Confirming on-chain…"
						: isClientProposing
							? `Create Contract Offer (${isUsdc ? "USDC" : "ETH"})`
							: "Propose Escrow Contract"}
			</button>
		</>
	);
}
