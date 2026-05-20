"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	useAccount,
	useChainId,
	useReadContract,
	useWriteContract,
	useWaitForTransactionReceipt,
	useSignMessage,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { keccak256, encodePacked, parseSignature } from "viem";
import { TRUSTLEDGER_ABI, STATUS_LABELS } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { formatEth } from "@/lib/utils";
import type { MagicLinkPayload } from "@/lib/magicLink";

function AcceptPageInner(): React.JSX.Element {
	const searchParams = useSearchParams();
	const token = searchParams.get("token") ?? "";

	const [payload, setPayload] = useState<MagicLinkPayload | null>(null);
	const [tokenError, setTokenError] = useState<string | null>(
		token === "" ? "No token provided." : null,
	);
	const [tokenLoading, setTokenLoading] = useState(token !== "");

	useEffect(() => {
		if (token === "") return;
		const verify = async (): Promise<void> => {
			try {
				const r = await fetch(`/api/magic-link/verify?token=${encodeURIComponent(token)}`);
				const data = (await r.json()) as {
					ok?: boolean;
					error?: string;
					payload?: MagicLinkPayload;
				};
				if (data.ok === true && data.payload !== undefined) setPayload(data.payload);
				else setTokenError(data.error ?? "Invalid link.");
			} catch {
				setTokenError("Failed to verify link.");
			} finally {
				setTokenLoading(false);
			}
		};
		void verify();
	}, [token]);

	const { address, isConnected } = useAccount();
	const chainId = useChainId();

	const contractId = payload !== null ? BigInt(payload.contractId) : 0n;

	const { data: contract, isLoading: contractLoading } = useReadContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "getContract",
		args: [contractId],
		query: { enabled: payload !== null },
	});

	const {
		signMessage,
		data: signature,
		isPending: isSigning,
		error: signError,
	} = useSignMessage();
	const {
		writeContract,
		data: txHash,
		isPending: isSending,
		error: writeError,
	} = useWriteContract();
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

	const explorerTxUrl = txHash !== undefined ? getExplorerTxUrl(chainId, txHash) : null;

	function handleSign(): void {
		if (payload === null) return;
		const message = keccak256(
			encodePacked(
				["uint256", "address"],
				[BigInt(payload.contractId), payload.freelancerAddress as `0x${string}`],
			),
		);
		signMessage({ message: { raw: message } });
	}

	useEffect(() => {
		if (signature === undefined || payload === null) return;
		const { v, r, s } = parseSignature(signature);
		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "acceptContract",
			args: [BigInt(payload.contractId), Number(v), r, s],
		});
	}, [signature, payload, writeContract]);

	// - Loading states -
	if (tokenLoading)
		return (
			<PageShell>
				<p className="text-gray-400">Verifying link…</p>
			</PageShell>
		);

	if (tokenError !== null) {
		return (
			<PageShell>
				<div className="rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-5 text-center">
					<p className="text-red-400 font-semibold mb-1">Invalid or Expired Link</p>
					<p className="text-gray-400 text-sm">{tokenError}</p>
				</div>
			</PageShell>
		);
	}

	if (!isConnected) {
		return (
			<PageShell>
				<p className="text-gray-400 text-sm mb-4">
					Connect the wallet at{" "}
					<span className="font-mono text-indigo-400">{payload?.freelancerAddress}</span>{" "}
					to accept contract #{payload?.contractId}.
				</p>
				<ConnectButton />
			</PageShell>
		);
	}

	// Wallet address mismatch
	const expectedAddress = payload?.freelancerAddress.toLowerCase();
	if (address?.toLowerCase() !== expectedAddress) {
		return (
			<PageShell>
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-6 py-5">
					<p className="text-yellow-400 font-semibold mb-1">Wrong Wallet</p>
					<p className="text-gray-400 text-sm">
						This link is for{" "}
						<span className="font-mono text-yellow-300">
							{payload?.freelancerAddress}
						</span>
						. Please switch to that account.
					</p>
				</div>
				<div className="mt-4">
					<ConnectButton />
				</div>
			</PageShell>
		);
	}

	if (contractLoading || contract === undefined) {
		return (
			<PageShell>
				<p className="text-gray-400">Loading contract…</p>
			</PageShell>
		);
	}

	const statusLabel = STATUS_LABELS[contract.status] ?? "Unknown";

	if (isSuccess) {
		return (
			<PageShell>
				<div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
					<svg
						className="w-8 h-8 text-green-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h2 className="text-2xl font-bold text-center mb-2">Contract Accepted!</h2>
				<p className="text-gray-400 text-sm text-center mb-4">
					The project deadline timer has started.
				</p>
				{txHash !== undefined && explorerTxUrl !== null && (
					<a
						href={explorerTxUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2 block text-center"
					>
						View transaction
					</a>
				)}
			</PageShell>
		);
	}

	const canAccept = contract.status === 0; // PENDING

	return (
		<PageShell>
			<h1 className="text-2xl font-bold mb-1">Contract #{payload?.contractId}</h1>
			<p className="text-gray-400 text-sm mb-6">Review the terms below before accepting.</p>

			<div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3 text-sm mb-6">
				<Row label="Status" value={statusLabel} />
				<Row label="Client" value={contract.client} mono />
				<Row label="Freelancer" value={contract.freelancer} mono />
				<Row label="Amount" value={`${formatEth(contract.amount)} ETH`} />
				<Row
					label="Deadline"
					value={
						contract.projectDeadline > 0n
							? new Date(Number(contract.projectDeadline) * 1000).toLocaleDateString()
							: "Set on acceptance"
					}
				/>
				{contract.holdBackBps > 0 && (
					<Row label="Hold-back" value={`${String(contract.holdBackBps / 100)}%`} />
				)}
				{contract.contractURI !== "" && (
					<Row
						label="Document"
						value={
							<a
								href={contract.contractURI.replace(
									"ipfs://",
									"https://ipfs.io/ipfs/",
								)}
								target="_blank"
								rel="noopener noreferrer"
								className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 truncate"
							>
								{contract.contractURI}
							</a>
						}
					/>
				)}
			</div>

			{!canAccept && (
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 text-sm text-yellow-400 mb-4">
					Contract is not in PENDING state (current: {statusLabel}). It may already be
					accepted or cancelled.
				</div>
			)}

			{(signError ?? writeError) !== null && (
				<p className="text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
					{((signError ?? writeError) as { shortMessage?: string } | null)
						?.shortMessage ?? (signError ?? writeError)?.message}
				</p>
			)}

			<button
				onClick={handleSign}
				disabled={!canAccept || isSigning || isSending || isConfirming}
				className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
			>
				{isSigning
					? "Sign in wallet…"
					: isSending
						? "Waiting for wallet…"
						: isConfirming
							? "Confirming on-chain…"
							: "Accept Contract"}
			</button>
		</PageShell>
	);
}

function Row({
	label,
	value,
	mono = false,
}: {
	label: string;
	value: React.ReactNode;
	mono?: boolean;
}): React.JSX.Element {
	return (
		<div className="flex justify-between gap-4">
			<span className="text-gray-500 shrink-0">{label}</span>
			<span
				className={`text-right truncate ${mono ? "font-mono text-xs text-gray-300" : "text-white"}`}
			>
				{value}
			</span>
		</div>
	);
}

function PageShell({ children }: { children: React.ReactNode }): React.JSX.Element {
	return <div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">{children}</div>;
}

export default function AcceptPage(): React.JSX.Element {
	return (
		<Suspense
			fallback={<div className="max-w-lg mx-auto px-6 py-16 text-gray-400">Loading…</div>}
		>
			<AcceptPageInner />
		</Suspense>
	);
}
