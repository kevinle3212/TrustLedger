"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, keccak256, toBytes, parseEventLogs } from "viem";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl } from "@/lib/wagmi";
import { daysToSeconds } from "@/lib/utils";
import { uploadToPinata } from "@/lib/ipfs";
import { encryptFile } from "@/lib/encryption";
import type { ArweaveJWK } from "@/lib/arweave";

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}): React.JSX.Element {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="text-sm font-medium text-gray-200">{label}</label>
			{children}
			{hint !== undefined && <p className="text-xs text-gray-500">{hint}</p>}
		</div>
	);
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
	return (
		<input
			{...props}
			className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
		/>
	);
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>): React.JSX.Element {
	return (
		<select
			{...props}
			className="rounded-lg bg-gray-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
		/>
	);
}

type DocMode = "upload" | "manual";
type UploadStatus = "idle" | "working" | "done" | "error";

export default function CreatePage(): React.JSX.Element {
	const { isConnected } = useAccount();
	const chainId = useChainId();
	const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
	const {
		isLoading: isConfirming,
		isSuccess,
		data: receipt,
	} = useWaitForTransactionReceipt({ hash: txHash });

	const [form, setForm] = useState({
		freelancer: "",
		freelancerEmail: "",
		amountEth: "",
		contractURI: "",
		estimatedDurationDays: "30",
		bufferFactor: "1200",
		acceptanceWindowDays: "3",
		arbitrationFeePct: "5",
		holdBack: "none" as "none" | "5" | "10" | "15",
		warrantyPeriodDays: "30",
	});

	const [magicLinkStatus, setMagicLinkStatus] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);

	// Document upload state
	const [docMode, setDocMode] = useState<DocMode>("upload");
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [encryptEnabled, setEncryptEnabled] = useState(false);
	const [passphrase, setPassphrase] = useState("");
	const [pinataJwt, setPinataJwt] = useState(process.env["NEXT_PUBLIC_PINATA_JWT"] ?? "");
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
	const [uploadError, setUploadError] = useState<string | null>(null);
	// Bytes that were actually uploaded (post-encryption if applicable) — reused for Arweave backup.
	const [uploadedBytes, setUploadedBytes] = useState<Uint8Array<ArrayBuffer> | null>(null);
	const [uploadedMime, setUploadedMime] = useState("application/octet-stream");
	// keccak256 of the uploaded bytes — used as contractHash instead of hashing the URI.
	const [fileHash, setFileHash] = useState<`0x${string}` | null>(null);

	// Arweave backup state
	const [arweaveWallet, setArweaveWallet] = useState<ArweaveJWK | null>(null);
	const [arweaveStatus, setArweaveStatus] = useState<UploadStatus>("idle");
	const [arweaveUri, setArweaveUri] = useState("");
	const [arweaveBalance, setArweaveBalance] = useState<string | null>(null);

	function set(key: keyof typeof form, value: string): void {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function handleSubmit(e: React.SyntheticEvent): void {
		e.preventDefault();

		const estimatedDuration = daysToSeconds(Number(form.estimatedDurationDays));
		const acceptanceWindow = daysToSeconds(Number(form.acceptanceWindowDays));
		const warrantyPeriod = BigInt(Number(form.warrantyPeriodDays) * 86400);
		const bufferFactor = BigInt(form.bufferFactor);
		const arbitrationFeeBps = Math.round(Number(form.arbitrationFeePct) * 100);
		const holdBackBps = form.holdBack === "none" ? 0 : Number(form.holdBack) * 100;
		const trimmedURI = form.contractURI.trim();
		const contractURI = trimmedURI !== "" ? trimmedURI : "ipfs://";
		// Prefer hash of file content over hash of the URI string.
		const contractHash = fileHash ?? keccak256(toBytes(contractURI));
		const value = parseEther(form.amountEth);

		writeContract({
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "createContract",
			args: [
				form.freelancer as `0x${string}`,
				contractHash,
				contractURI,
				estimatedDuration,
				bufferFactor,
				acceptanceWindow,
				arbitrationFeeBps,
				holdBackBps,
				warrantyPeriod,
				"0x0000000000000000000000000000000000000000",
				0n,
			],
			value,
		});
	}

	useEffect(() => {
		if (!isSuccess || form.freelancerEmail === "") return;

		const logs = parseEventLogs({
			abi: TRUSTLEDGER_ABI,
			eventName: "ContractCreated",
			logs: receipt.logs,
		});
		const contractId = logs[0]?.args.id;
		if (contractId === undefined) return;

		fetch("/api/magic-link/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contractId: contractId.toString(),
				freelancerEmail: form.freelancerEmail,
				freelancerAddress: form.freelancer,
			}),
		})
			.then((r) => {
				setMagicLinkStatus(r.ok ? "sent" : "error");
			})
			.catch(() => {
				setMagicLinkStatus("error");
			});
	}, [isSuccess, receipt, form.freelancerEmail, form.freelancer]);

	async function handleUploadToIPFS(): Promise<void> {
		if (selectedFile === null) return;
		if (pinataJwt === "") {
			setUploadError("Enter your Pinata JWT to enable IPFS upload.");
			setUploadStatus("error");
			return;
		}

		setUploadStatus("working");
		setUploadError(null);

		try {
			const rawBytes = new Uint8Array(await selectedFile.arrayBuffer());
			let bytes: Uint8Array<ArrayBuffer>;
			let mime: string;

			if (encryptEnabled) {
				if (passphrase === "") throw new Error("Passphrase required for encryption.");
				bytes = await encryptFile(rawBytes.buffer, passphrase);
				mime = "application/octet-stream";
			} else {
				// new Uint8Array(ArrayBuffer) narrows to Uint8Array<ArrayBuffer>.
				bytes = new Uint8Array(rawBytes.buffer);
				mime = selectedFile.type !== "" ? selectedFile.type : "application/octet-stream";
			}

			const hash = keccak256(bytes);
			// Pass the underlying ArrayBuffer — Blob accepts ArrayBuffer as BlobPart.
			const blob = new Blob([bytes.buffer], { type: mime });
			const uri = await uploadToPinata(blob, selectedFile.name, pinataJwt);

			setUploadedBytes(bytes);
			setUploadedMime(mime);
			setFileHash(hash);
			set("contractURI", uri);
			setUploadStatus("done");
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : String(err));
			setUploadStatus("error");
		}
	}

	function handleArweaveWalletLoad(e: React.ChangeEvent<HTMLInputElement>): void {
		const file = e.target.files?.[0];
		if (file === undefined) return;
		const reader = new FileReader();
		reader.onload = async (ev): Promise<void> => {
			try {
				const jwk = JSON.parse(ev.target?.result as string) as ArweaveJWK;
				setArweaveWallet(jwk);
				// Fetch balance so the user knows they have AR to spend.
				const { getArweaveBalance } = await import("@/lib/arweave");
				const bal = await getArweaveBalance(jwk);
				setArweaveBalance(bal);
			} catch {
				// ignore parse errors — bad wallet file
			}
		};
		reader.readAsText(file);
	}

	async function handleArweaveUpload(): Promise<void> {
		if (uploadedBytes === null || arweaveWallet === null) return;
		setArweaveStatus("working");
		try {
			const { uploadToArweave } = await import("@/lib/arweave");
			const uri = await uploadToArweave(uploadedBytes, uploadedMime, arweaveWallet);
			setArweaveUri(uri);
			setArweaveStatus("done");
		} catch {
			setArweaveStatus("error");
		}
	}

	if (!isConnected) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-400 text-lg">Connect your wallet to create a contract.</p>
				<ConnectButton />
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="max-w-lg mx-auto px-6 py-24 flex flex-col items-center gap-6 text-center">
				<div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
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
				<h2 className="text-2xl font-bold">Contract Created!</h2>
				<p className="text-gray-400 text-sm">
					Transaction confirmed in block {receipt.blockNumber.toString()}.
				</p>
				<a
					href={getExplorerTxUrl(chainId, txHash ?? "")}
					target="_blank"
					rel="noopener noreferrer"
					className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2"
				>
					View on explorer
				</a>
				{form.freelancerEmail !== "" && (
					<p className="text-sm">
						{magicLinkStatus === "sending" && (
							<span className="text-gray-400">Sending magic link…</span>
						)}
						{magicLinkStatus === "sent" && (
							<span className="text-green-400">
								Magic link sent to {form.freelancerEmail}
							</span>
						)}
						{magicLinkStatus === "error" && (
							<span className="text-red-400">
								Failed to send magic link — check server env vars.
							</span>
						)}
					</p>
				)}
				<button
					onClick={() => {
						window.location.reload();
					}}
					className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
				>
					Create Another
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-6 py-12">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">New Escrow Contract</h1>
				<p className="text-gray-400 mt-2 text-sm">
					ETH will be held in escrow until the freelancer delivers and you approve - or a
					dispute is resolved.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				{/* Parties & Payment */}
				<div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
					<h2 className="font-semibold text-white">Parties &amp; Payment</h2>

					<Field
						label="Freelancer Address"
						hint="The wallet that will receive payment on completion."
					>
						<Input
							type="text"
							placeholder="0x..."
							value={form.freelancer}
							onChange={(e) => {
								set("freelancer", e.target.value);
							}}
							required
							pattern="^0x[0-9a-fA-F]{40}$"
						/>
					</Field>

					<Field
						label="Freelancer Email"
						hint="A signed magic link will be sent here so the freelancer can accept via the web."
					>
						<Input
							type="email"
							placeholder="freelancer@example.com"
							value={form.freelancerEmail}
							onChange={(e) => {
								set("freelancerEmail", e.target.value);
							}}
						/>
					</Field>

					<Field label="Escrow Amount (ETH)" hint="Total ETH to lock in escrow.">
						<Input
							type="number"
							placeholder="0.5"
							min="0.000001"
							step="any"
							value={form.amountEth}
							onChange={(e) => {
								set("amountEth", e.target.value);
							}}
							required
						/>
					</Field>
				</div>

				{/* Contract Document */}
				<div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-white">Contract Document</h2>
						<div className="flex gap-1 rounded-lg bg-white/5 p-1">
							{(["upload", "manual"] as DocMode[]).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => {
										setDocMode(m);
									}}
									className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
										docMode === m
											? "bg-indigo-600 text-white"
											: "text-gray-400 hover:text-white"
									}`}
								>
									{m === "upload" ? "Upload File" : "Enter URI"}
								</button>
							))}
						</div>
					</div>

					{docMode === "upload" ? (
						<div className="flex flex-col gap-3">
							{/* File picker */}
							<label className="flex flex-col items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-white/15 hover:border-indigo-500/50 cursor-pointer transition-colors">
								<input
									type="file"
									className="sr-only"
									onChange={(e) => {
										setSelectedFile(e.target.files?.[0] ?? null);
										setUploadStatus("idle");
										setFileHash(null);
										setUploadedBytes(null);
									}}
								/>
								<span className="text-sm text-gray-400">
									{selectedFile !== null
										? selectedFile.name
										: "Click to browse or drop a file"}
								</span>
								{selectedFile !== null && (
									<span className="text-xs text-gray-600">
										{(selectedFile.size / 1024).toFixed(1)} KB
									</span>
								)}
							</label>

							{/* Encryption toggle */}
							<label className="flex items-center gap-3 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={encryptEnabled}
									onChange={(e) => {
										setEncryptEnabled(e.target.checked);
									}}
									className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
								/>
								<span className="text-sm text-gray-300">
									Encrypt before upload (AES-256-GCM)
								</span>
							</label>

							{encryptEnabled && (
								<Field
									label="Passphrase"
									hint="Share this with the other party via a separate secure channel. You cannot decrypt without it."
								>
									<Input
										type="password"
										placeholder="Strong passphrase…"
										value={passphrase}
										onChange={(e) => {
											setPassphrase(e.target.value);
										}}
									/>
								</Field>
							)}

							{/* Pinata JWT — shown if not baked in via env */}
							{(process.env["NEXT_PUBLIC_PINATA_JWT"] === undefined ||
								process.env["NEXT_PUBLIC_PINATA_JWT"] === "") && (
								<Field
									label="Pinata JWT"
									hint="Get a free JWT at pinata.cloud → API Keys. Set NEXT_PUBLIC_PINATA_JWT in .env.local to persist it."
								>
									<Input
										type="password"
										placeholder="eyJhbGciOiJIUzI1NiIs…"
										value={pinataJwt}
										onChange={(e) => {
											setPinataJwt(e.target.value);
										}}
									/>
								</Field>
							)}

							{/* Upload button */}
							<button
								type="button"
								onClick={() => {
									void handleUploadToIPFS();
								}}
								disabled={
									selectedFile === null ||
									uploadStatus === "working" ||
									(encryptEnabled && passphrase === "") ||
									pinataJwt === ""
								}
								className="px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
							>
								{uploadStatus === "working" ? "Uploading…" : "Upload to IPFS"}
							</button>

							{/* Upload result */}
							{uploadStatus === "done" && form.contractURI !== "" && (
								<div className="flex flex-col gap-3">
									<div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300">
										<span className="shrink-0 mt-0.5">✓</span>
										<span className="font-mono break-all">
											{form.contractURI}
										</span>
									</div>

									{/* Arweave backup */}
									<div className="flex flex-col gap-2 border-t border-white/5 pt-3">
										<p className="text-xs text-gray-500">
											Permanent backup to Arweave (optional — for long-term
											legal retention)
										</p>

										{arweaveStatus === "idle" && (
											<div className="flex items-center gap-3">
												<label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
													<input
														type="file"
														accept=".json"
														className="sr-only"
														onChange={handleArweaveWalletLoad}
													/>
													{arweaveWallet !== null
														? "Wallet loaded"
														: "Load Arweave wallet (.json)"}
												</label>
												{arweaveWallet !== null && (
													<>
														{arweaveBalance !== null && (
															<span className="text-xs text-gray-500">
																{arweaveBalance} AR
															</span>
														)}
														<button
															type="button"
															onClick={() => {
																void handleArweaveUpload();
															}}
															className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
														>
															Upload to Arweave
														</button>
													</>
												)}
											</div>
										)}
										{arweaveStatus === "working" && (
											<span className="text-xs text-gray-500">
												Uploading to Arweave…
											</span>
										)}
										{arweaveStatus === "done" && arweaveUri !== "" && (
											<span className="text-xs text-green-400 font-mono break-all">
												✓ {arweaveUri}
											</span>
										)}
										{arweaveStatus === "error" && (
											<span className="text-xs text-red-400">
												Arweave upload failed — check wallet balance.
											</span>
										)}
									</div>
								</div>
							)}

							{uploadStatus === "error" &&
								uploadError !== null &&
								uploadError !== "" && (
									<p className="text-xs text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
										{uploadError}
									</p>
								)}
						</div>
					) : (
						<Field
							label="Contract Document URI"
							hint="IPFS link or URL to the off-chain agreement. A hash of this is stored on-chain."
						>
							<Input
								type="text"
								placeholder="ipfs://Qm…"
								value={form.contractURI}
								onChange={(e) => {
									set("contractURI", e.target.value);
								}}
							/>
						</Field>
					)}
				</div>

				{/* Timeline */}
				<div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
					<h2 className="font-semibold text-white">Timeline</h2>

					<div className="grid grid-cols-2 gap-4">
						<Field
							label="Estimated Duration (days)"
							hint="How long the project should take."
						>
							<Input
								type="number"
								min="1"
								value={form.estimatedDurationDays}
								onChange={(e) => {
									set("estimatedDurationDays", e.target.value);
								}}
								required
							/>
						</Field>

						<Field
							label="Buffer Factor"
							hint="Project deadline = duration × buffer / 1000. E.g. 1200 = 1.2× buffer."
						>
							<Input
								type="number"
								min="1000"
								step="100"
								value={form.bufferFactor}
								onChange={(e) => {
									set("bufferFactor", e.target.value);
								}}
								required
							/>
						</Field>
					</div>

					<Field
						label="Acceptance Window (days)"
						hint="How long you have to review submitted work. Minimum 2 days."
					>
						<Input
							type="number"
							min="2"
							value={form.acceptanceWindowDays}
							onChange={(e) => {
								set("acceptanceWindowDays", e.target.value);
							}}
							required
						/>
					</Field>
				</div>

				{/* Advanced */}
				<div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
					<h2 className="font-semibold text-white">Advanced Options</h2>

					<Field
						label="Arbitration Fee (%)"
						hint="Percentage of escrow set aside for jurors if a dispute is opened (0-50%)."
					>
						<Input
							type="number"
							min="0"
							max="50"
							step="0.5"
							value={form.arbitrationFeePct}
							onChange={(e) => {
								set("arbitrationFeePct", e.target.value);
							}}
							required
						/>
					</Field>

					<Field
						label="Warranty Hold-back"
						hint="Portion withheld from the freelancer until the warranty period elapses."
					>
						<Select
							value={form.holdBack}
							onChange={(e) => {
								set("holdBack", e.target.value);
							}}
						>
							<option value="none">None</option>
							<option value="5">5%</option>
							<option value="10">10%</option>
							<option value="15">15%</option>
						</Select>
					</Field>

					{form.holdBack !== "none" && (
						<Field
							label="Warranty Period (days)"
							hint="How long the hold-back is locked after work is approved."
						>
							<Input
								type="number"
								min="1"
								value={form.warrantyPeriodDays}
								onChange={(e) => {
									set("warrantyPeriodDays", e.target.value);
								}}
								required
							/>
						</Field>
					)}
				</div>

				{/* Summary */}
				{form.amountEth !== "" && (
					<div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm text-gray-300 flex flex-col gap-1">
						<p>
							<span className="text-gray-400">Escrow amount:</span>{" "}
							<span className="text-white font-medium">{form.amountEth} ETH</span>
						</p>
						<p>
							<span className="text-gray-400">Deadline:</span>{" "}
							<span className="text-white font-medium">
								~
								{Math.round(
									(Number(form.estimatedDurationDays) *
										Number(form.bufferFactor)) /
										1000,
								)}{" "}
								days from now
							</span>
						</p>
						{form.holdBack !== "none" && (
							<p>
								<span className="text-gray-400">Hold-back:</span>{" "}
								<span className="text-white font-medium">
									{form.holdBack}% (
									{(
										(Number(form.amountEth) * Number(form.holdBack)) /
										100
									).toFixed(6)}{" "}
									ETH)
								</span>
							</p>
						)}
					</div>
				)}

				{writeError !== null && (
					<p className="text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
						{(writeError as { shortMessage?: string }).shortMessage ??
							writeError.message}
					</p>
				)}

				<button
					type="submit"
					disabled={isPending || isConfirming}
					className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
				>
					{isPending
						? "Waiting for wallet…"
						: isConfirming
							? "Confirming on-chain…"
							: "Create Escrow Contract"}
				</button>
			</form>
		</div>
	);
}
