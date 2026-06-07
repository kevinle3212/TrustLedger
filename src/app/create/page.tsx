"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	useAccount,
	useChainId,
	useWriteContract,
	useSimulateContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { parseEther, parseUnits, keccak256, toBytes, parseEventLogs } from "viem";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getExplorerTxUrl, getUsdcAddress } from "@/lib/wagmi";
import { daysToSeconds } from "@/lib/utils";
import {
	validateContractUri,
	validateEmail,
	validateEthAddress,
	validateEthAmount,
	validateUsdcAmount,
	validateNumberInRange,
	validateRequired,
} from "@/lib/validation";
import { uploadToPinata } from "@/lib/ipfs";
import { encryptFile } from "@/lib/encryption";
import type { ArweaveJWK } from "@/lib/arweave";
import { useRole } from "@/contexts/RoleContext";

type DocMode = "upload" | "manual";
type UploadStatus = "idle" | "working" | "done" | "error";

export default function CreatePage(): React.JSX.Element {
	const { isConnected } = useAccount();
	const chainId = useChainId();
	const usdcAddress = getUsdcAddress(chainId);
	const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
	const {
		isLoading: isConfirming,
		isSuccess,
		data: receipt,
	} = useWaitForTransactionReceipt({ hash: txHash });
	const { role: globalRole } = useRole();

	// "freelancer" = current user is the freelancer proposing unfunded terms (existing flow).
	// "client"     = current user is the client proposing + funding immediately.
	// Defaults to the global role toggle so the form opens in the expected mode.
	const [proposerRole, setProposerRole] = useState<"freelancer" | "client">(globalRole);
	const isClientProposing = proposerRole === "client";

	// "eth" = native ETH; "usdc" = ERC-20 USDC on the connected chain.
	const [paymentToken, setPaymentToken] = useState<"eth" | "usdc">("eth");
	const isUsdc = paymentToken === "usdc";

	const [form, setForm] = useState({
		client: "",
		clientEmail: "",
		amount: "",
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
	// Bytes that were actually uploaded (post-encryption if applicable) - reused for Arweave backup.
	const uploadedBytes = useRef<Uint8Array<ArrayBuffer> | null>(null);
	const uploadedMime = useRef("application/octet-stream");
	// keccak256 of the uploaded bytes - used as contractHash instead of hashing the URI.
	const [fileHash, setFileHash] = useState<`0x${string}` | null>(null);

	// Arweave backup state
	const [arweaveWallet, setArweaveWallet] = useState<ArweaveJWK | null>(null);
	const [arweaveStatus, setArweaveStatus] = useState<UploadStatus>("idle");
	const [arweaveUri, setArweaveUri] = useState("");
	const [arweaveBalance, setArweaveBalance] = useState<string | null>(null);

	function set(key: keyof typeof form, value: string): void {
		setForm((f) => ({ ...f, [key]: value }));
	}

	// ── Field validation ────────────────────────────────────────────────────────
	// Each field's error is computed from current state; it is only surfaced once
	// the field has been blurred (touched) or the user has attempted to submit, so
	// the form doesn't shout at the user before they've typed.
	const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
	const [submitAttempted, setSubmitAttempted] = useState(false);

	function markTouched(key: string): void {
		setTouched((t) => ({ ...t, [key]: true }));
	}

	const fieldErrors = useMemo(
		() => ({
			client: validateEthAddress(form.client),
			clientEmail: validateEmail(form.clientEmail),
			amount: isUsdc ? validateUsdcAmount(form.amount) : validateEthAmount(form.amount),
			contractURI: docMode === "manual" ? validateContractUri(form.contractURI) : undefined,
			paymentToken:
				isUsdc && usdcAddress === undefined
					? "USDC is not supported on this network. Switch to Sepolia, Arbitrum, Base, or Optimism."
					: undefined,
			estimatedDurationDays: validateNumberInRange(form.estimatedDurationDays, 1, 3650, {
				integer: true,
				unit: "days",
			}),
			bufferFactor: validateNumberInRange(form.bufferFactor, 1000, 100000, { integer: true }),
			acceptanceWindowDays: validateNumberInRange(form.acceptanceWindowDays, 2, 3650, {
				integer: true,
				unit: "days",
			}),
			arbitrationFeePct: validateNumberInRange(form.arbitrationFeePct, 0, 50),
			warrantyPeriodDays:
				form.holdBack === "none"
					? undefined
					: validateNumberInRange(form.warrantyPeriodDays, 1, 3650, {
							integer: true,
							unit: "days",
						}),
			pinataJwt:
				docMode === "upload" && selectedFile !== null
					? validateRequired(pinataJwt, "Pinata JWT")
					: undefined,
			passphrase: encryptEnabled ? validateRequired(passphrase, "Passphrase") : undefined,
		}),
		[form, docMode, selectedFile, pinataJwt, encryptEnabled, passphrase, isUsdc, usdcAddress],
	);

	function showError(key: keyof typeof fieldErrors): string | undefined {
		return touched[key] === true || submitAttempted ? fieldErrors[key] : undefined;
	}

	const hasBlockingErrors = Object.values(fieldErrors).some((e) => e !== undefined);

	// Pre-compute tx args whenever the form changes - fed into useSimulateContract so the
	// transaction is validated on-chain before MetaMask opens. This prevents the "gas limit
	// too high" symptom caused by gas estimation failing on a reverting transaction.
	const txArgs = useMemo(() => {
		if (
			!/^0x[0-9a-fA-F]{40}$/.test(form.client) ||
			form.amount === "" ||
			Number(form.amount) <= 0 ||
			Number(form.arbitrationFeePct) <= 0
		) {
			return null;
		}
		if (isUsdc && usdcAddress === undefined) return null;
		const trimmedURI = form.contractURI.trim();
		const contractURI = trimmedURI !== "" ? trimmedURI : "ipfs://";
		const parsedAmount = isUsdc ? parseUnits(form.amount, 6) : parseEther(form.amount);
		// usdcAddress is always defined here — we return null above when isUsdc && usdcAddress === undefined.
		const tokenAddress: `0x${string}` = isUsdc
			? (usdcAddress ?? "0x0000000000000000000000000000000000000000")
			: "0x0000000000000000000000000000000000000000";
		const sharedArgs = [
			fileHash ?? keccak256(toBytes(contractURI)),
			contractURI,
			daysToSeconds(Number(form.estimatedDurationDays)),
			BigInt(form.bufferFactor),
			daysToSeconds(Number(form.acceptanceWindowDays)),
			Math.round(Number(form.arbitrationFeePct) * 100),
			form.holdBack === "none" ? 0 : Number(form.holdBack) * 100,
			form.holdBack === "none" ? 0n : BigInt(Number(form.warrantyPeriodDays) * 86400),
			tokenAddress,
			parsedAmount,
		] as const;

		if (isClientProposing) {
			// Client proposes unfunded terms; funds are locked only after the freelancer accepts
			// and the client calls fundContractByClient.
			return {
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: "proposeContractByClient" as const,
				args: [form.client as `0x${string}`, ...sharedArgs] as const,
			};
		}
		// Freelancer proposes unfunded terms; no ETH sent with this transaction.
		return {
			address: TRUSTLEDGER_ADDRESS,
			abi: TRUSTLEDGER_ABI,
			functionName: "proposeContract" as const,
			args: [form.client as `0x${string}`, ...sharedArgs] as const,
		};
	}, [form, fileHash, isClientProposing, isUsdc, usdcAddress]);

	// wagmi's overloaded types can't handle a union of two different functionName
	// shapes in a single call, so we use two hooks — only one is enabled at a time.
	const clientTxArgs = txArgs?.functionName === "proposeContractByClient" ? txArgs : null;
	const freelancerTxArgs = txArgs?.functionName === "proposeContract" ? txArgs : null;

	const { data: clientSimData, error: clientSimError } = useSimulateContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "proposeContractByClient",
		args: clientTxArgs?.args,
		query: { enabled: clientTxArgs !== null },
	});
	const { data: freelancerSimData, error: freelancerSimError } = useSimulateContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "proposeContract",
		args: freelancerTxArgs?.args,
		query: { enabled: freelancerTxArgs !== null },
	});
	const simData = clientSimData ?? freelancerSimData;
	const simError = clientSimError ?? freelancerSimError;

	function handleSubmit(e: React.SyntheticEvent): void {
		e.preventDefault();
		setSubmitAttempted(true);
		if (hasBlockingErrors) return;
		if (simData?.request !== undefined) {
			writeContract(simData.request as Parameters<typeof writeContract>[0]);
		}
	}

	useEffect(() => {
		if (!isSuccess || form.clientEmail === "") return;

		// Parse the correct event based on which flow was used.
		const eventName = isClientProposing ? "ContractProposedByClient" : "ContractProposed";
		const logs = parseEventLogs({
			abi: TRUSTLEDGER_ABI,
			eventName,
			logs: receipt.logs,
		});
		const contractId = (logs[0] as { args?: { id?: bigint } } | undefined)?.args?.id;
		if (contractId === undefined) return;

		fetch("/api/magic-link/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contractId: contractId.toString(),
				clientEmail: form.clientEmail,
				clientAddress: form.client,
				// "freelancer" role routes the link to /freelancer/review
				role: isClientProposing ? "freelancer" : "client",
			}),
		})
			.then((r) => {
				setMagicLinkStatus(r.ok ? "sent" : "error");
			})
			.catch(() => {
				setMagicLinkStatus("error");
			});
	}, [isSuccess, receipt, form.clientEmail, form.client, isClientProposing]);

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
			// Pass the underlying ArrayBuffer - Blob accepts ArrayBuffer as BlobPart.
			const blob = new Blob([bytes.buffer], { type: mime });
			const uri = await uploadToPinata(blob, selectedFile.name, pinataJwt);

			uploadedBytes.current = bytes;
			uploadedMime.current = mime;
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
				// ignore parse errors - bad wallet file
			}
		};
		reader.readAsText(file);
	}

	async function handleArweaveUpload(): Promise<void> {
		if (uploadedBytes.current === null || arweaveWallet === null) return;
		setArweaveStatus("working");
		try {
			const { uploadToArweave } = await import("@/lib/arweave");
			const uri = await uploadToArweave(
				uploadedBytes.current,
				uploadedMime.current,
				arweaveWallet,
			);
			setArweaveUri(uri);
			setArweaveStatus("done");
		} catch {
			setArweaveStatus("error");
		}
	}

	if (!isConnected) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-500 dark:text-gray-400 text-lg">
					Connect your wallet to propose a contract.
				</p>
				<ConnectButton />
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="max-w-lg mx-auto px-6 py-24 flex flex-col items-center gap-6 text-center">
				<div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
					<svg
						className="w-8 h-8 text-green-500 dark:text-green-400"
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
				<h2 className="text-2xl font-bold">
					{isClientProposing ? "Contract Offer Created!" : "Contract Proposed!"}
				</h2>
				<p className="text-gray-500 dark:text-gray-400 text-sm">
					Transaction confirmed in block {receipt.blockNumber.toString()}.
					{isClientProposing &&
						" The freelancer will review and accept. You will then be prompted to fund the escrow to start the project."}
				</p>
				<a
					href={getExplorerTxUrl(chainId, txHash ?? "")}
					target="_blank"
					rel="noopener noreferrer"
					className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm underline underline-offset-2"
				>
					View on explorer
				</a>
				{form.clientEmail !== "" && (
					<p className="text-sm">
						{magicLinkStatus === "sending" && (
							<span className="text-gray-500 dark:text-gray-400">
								Sending magic link…
							</span>
						)}
						{magicLinkStatus === "sent" && (
							<span className="text-green-500 dark:text-green-400">
								{isClientProposing ? "Review link" : "Magic link"} sent to{" "}
								{form.clientEmail}
							</span>
						)}
						{magicLinkStatus === "error" && (
							<span className="text-red-500 dark:text-red-400">
								Failed to send magic link - check server env vars.
							</span>
						)}
					</p>
				)}
				<button
					type="button"
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
				<h1 className="text-3xl font-bold">
					{isClientProposing ? "Create Contract Offer" : "Propose Escrow Contract"}
				</h1>
				<p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
					{isClientProposing
						? "You propose the terms. The freelancer reviews and accepts, then you fund the escrow to start the project."
						: `You propose the terms; the client reviews and locks the ${isUsdc ? "USDC" : "ETH"} in escrow on acceptance. Funds are released once you deliver and the client approves — or a dispute is resolved.`}
				</p>
			</div>

			{/* Role toggle */}
			<div className="mb-6 flex items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">I am the:</span>
				<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
					{(["freelancer", "client"] as const).map((r) => (
						<button
							key={r}
							type="button"
							onClick={() => {
								setProposerRole(r);
							}}
							className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
								proposerRole === r
									? "bg-indigo-600 text-white"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{r}
						</button>
					))}
				</div>
				{isClientProposing && (
					<span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
						BEWARE: The proposed currency is locked on submit AND freelancer agreement!
					</span>
				)}
			</div>

			{/* Currency selector */}
			<div className="mb-6 flex items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">Payment currency:</span>
				<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
					{(["eth", "usdc"] as const).map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => {
								setPaymentToken(t);
								set("amount", "");
							}}
							className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors uppercase ${
								paymentToken === t
									? "bg-indigo-600 text-white"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{t}
						</button>
					))}
				</div>
				{isUsdc && usdcAddress === undefined && (
					<span className="text-xs text-red-500 dark:text-red-400">
						USDC not supported on this network.
					</span>
				)}
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				{/* Parties & Payment */}
				<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Parties &amp; Payment
					</h2>

					<Field
						label={isClientProposing ? "Freelancer Address" : "Client Address"}
						hint={
							isClientProposing
								? "The wallet that will review, accept, and deliver the work."
								: "The wallet that will review, fund, and approve this contract."
						}
						error={showError("client")}
					>
						<Input
							type="text"
							placeholder="0x..."
							value={form.client}
							onChange={(e) => {
								set("client", e.target.value);
							}}
							onBlur={() => {
								markTouched("client");
							}}
							error={showError("client") !== undefined}
							required
							pattern="^0x[0-9a-fA-F]{40}$"
						/>
					</Field>

					<Field
						label={isClientProposing ? "Freelancer Email" : "Client Email"}
						hint={
							isClientProposing
								? "A signed magic link will be sent here so the freelancer can review and accept via the web."
								: "A signed magic link will be sent here so the client can review and accept via the web."
						}
						error={showError("clientEmail")}
					>
						<Input
							type="email"
							placeholder="client@example.com"
							value={form.clientEmail}
							onChange={(e) => {
								set("clientEmail", e.target.value);
							}}
							onBlur={() => {
								markTouched("clientEmail");
							}}
							error={showError("clientEmail") !== undefined}
						/>
					</Field>

					<Field
						label={`Escrow Amount (${isUsdc ? "USDC" : "ETH"})`}
						hint={
							isClientProposing
								? `Total ${isUsdc ? "USDC" : "ETH"} you agree to lock in escrow once the freelancer accepts.${isUsdc ? " You will approve the USDC transfer when funding." : ""}`
								: `Total ${isUsdc ? "USDC" : "ETH"} the client will lock in escrow on acceptance.${isUsdc ? " The client must approve the USDC transfer before funding." : ""}`
						}
						error={showError("amount")}
					>
						<Input
							type="number"
							placeholder={isUsdc ? "100" : "0.5"}
							min={isUsdc ? "0.01" : "0.000001"}
							step="any"
							value={form.amount}
							onChange={(e) => {
								set("amount", e.target.value);
							}}
							onBlur={() => {
								markTouched("amount");
							}}
							error={showError("amount") !== undefined}
							required
						/>
					</Field>
					{showError("paymentToken") !== undefined && (
						<p className="text-xs text-red-500 dark:text-red-400">
							{showError("paymentToken")}
						</p>
					)}
				</div>

				{/* Contract Document */}
				<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 dark:text-white">
							Contract Document
						</h2>
						<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
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
											: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
							<label className="flex flex-col items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-indigo-500/50 cursor-pointer transition-colors">
								<input
									type="file"
									className="sr-only"
									onChange={(e) => {
										setSelectedFile(e.target.files?.[0] ?? null);
										setUploadStatus("idle");
										setFileHash(null);
										uploadedBytes.current = null;
									}}
								/>
								<span className="text-sm text-gray-500 dark:text-gray-400">
									{selectedFile !== null
										? selectedFile.name
										: "Click to browse or drop a file"}
								</span>
								{selectedFile !== null && (
									<span className="text-xs text-gray-500">
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
									className="w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 text-indigo-500 focus:ring-indigo-500"
								/>
								<span className="text-sm text-gray-600 dark:text-gray-300">
									Encrypt before upload (AES-256-GCM)
								</span>
							</label>

							{encryptEnabled && (
								<Field
									label="Passphrase"
									hint="Share this with the other party via a separate secure channel. You cannot decrypt without it."
									error={showError("passphrase")}
								>
									<Input
										type="password"
										placeholder="Strong passphrase…"
										value={passphrase}
										onChange={(e) => {
											setPassphrase(e.target.value);
										}}
										onBlur={() => {
											markTouched("passphrase");
										}}
										error={showError("passphrase") !== undefined}
									/>
								</Field>
							)}

							{/* Pinata JWT - shown if not baked in via env */}
							{(process.env["NEXT_PUBLIC_PINATA_JWT"] === undefined ||
								process.env["NEXT_PUBLIC_PINATA_JWT"] === "") && (
								<Field
									label="Pinata JWT"
									hint="Required to upload the document to IPFS."
									error={showError("pinataJwt")}
								>
									<Input
										type="password"
										placeholder="eyJhbGciOiJIUzI1NiIs…"
										value={pinataJwt}
										onChange={(e) => {
											setPinataJwt(e.target.value);
										}}
										onBlur={() => {
											markTouched("pinataJwt");
										}}
										error={showError("pinataJwt") !== undefined}
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
									<div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-300">
										<span className="shrink-0 mt-0.5">✓</span>
										<span className="font-mono break-all">
											{form.contractURI}
										</span>
									</div>

									{/* Arweave backup */}
									<div className="flex flex-col gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
										<p className="text-xs text-gray-500">
											Permanent backup to Arweave (optional - for long-term
											legal retention)
										</p>

										{arweaveStatus === "idle" && (
											<div className="flex items-center gap-3">
												<label className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2">
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
															className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2"
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
											<span className="text-xs text-green-500 dark:text-green-400 font-mono break-all">
												✓ {arweaveUri}
											</span>
										)}
										{arweaveStatus === "error" && (
											<span className="text-xs text-red-500 dark:text-red-400">
												Arweave upload failed - check wallet balance.
											</span>
										)}
									</div>
								</div>
							)}

							{uploadStatus === "error" &&
								uploadError !== null &&
								uploadError !== "" && (
									<p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
										{uploadError}
									</p>
								)}
						</div>
					) : (
						<Field
							label="Contract Document URI"
							hint="IPFS link or URL to the off-chain agreement. A hash of this is stored on-chain."
							error={showError("contractURI")}
						>
							<Input
								type="text"
								placeholder="ipfs://Qm…"
								value={form.contractURI}
								onChange={(e) => {
									set("contractURI", e.target.value);
								}}
								onBlur={() => {
									markTouched("contractURI");
								}}
								error={showError("contractURI") !== undefined}
							/>
						</Field>
					)}
				</div>

				{/* Timeline */}
				<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
					<h2 className="font-semibold text-gray-900 dark:text-white">Timeline</h2>

					<div className="grid grid-cols-2 gap-4">
						<Field
							label="Estimated Duration (days)"
							hint="How long the project should take."
							error={showError("estimatedDurationDays")}
						>
							<Input
								type="number"
								min="1"
								value={form.estimatedDurationDays}
								onChange={(e) => {
									set("estimatedDurationDays", e.target.value);
								}}
								onBlur={() => {
									markTouched("estimatedDurationDays");
								}}
								error={showError("estimatedDurationDays") !== undefined}
								required
							/>
						</Field>

						<Field
							label="Buffer Factor"
							hint="Project deadline = duration × buffer / 1000. E.g. 1200 = 1.2× buffer."
							error={showError("bufferFactor")}
						>
							<Input
								type="number"
								min="1000"
								step="100"
								value={form.bufferFactor}
								onChange={(e) => {
									set("bufferFactor", e.target.value);
								}}
								onBlur={() => {
									markTouched("bufferFactor");
								}}
								error={showError("bufferFactor") !== undefined}
								required
							/>
						</Field>
					</div>

					<Field
						label="Acceptance Window (days)"
						hint="How long you have to review submitted work. Minimum 2 days."
						error={showError("acceptanceWindowDays")}
					>
						<Input
							type="number"
							min="2"
							value={form.acceptanceWindowDays}
							onChange={(e) => {
								set("acceptanceWindowDays", e.target.value);
							}}
							onBlur={() => {
								markTouched("acceptanceWindowDays");
							}}
							error={showError("acceptanceWindowDays") !== undefined}
							required
						/>
					</Field>
				</div>

				{/* Advanced */}
				<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Advanced Options
					</h2>

					<Field
						label="Arbitration Fee (%)"
						hint="Percentage of escrow set aside for jurors if a dispute is opened (0-50%)."
						error={showError("arbitrationFeePct")}
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
							onBlur={() => {
								markTouched("arbitrationFeePct");
							}}
							error={showError("arbitrationFeePct") !== undefined}
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
							error={showError("warrantyPeriodDays")}
						>
							<Input
								type="number"
								min="1"
								value={form.warrantyPeriodDays}
								onChange={(e) => {
									set("warrantyPeriodDays", e.target.value);
								}}
								onBlur={() => {
									markTouched("warrantyPeriodDays");
								}}
								error={showError("warrantyPeriodDays") !== undefined}
								required
							/>
						</Field>
					)}
				</div>

				{/* Summary */}
				{form.amount !== "" && (
					<div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm text-indigo-900 dark:text-indigo-100 flex flex-col gap-1">
						<p>
							<span className="text-indigo-700 dark:text-indigo-300">
								Escrow amount:
							</span>{" "}
							<span className="text-gray-900 dark:text-white font-medium">
								{form.amount} {isUsdc ? "USDC" : "ETH"}
							</span>
						</p>
						{isUsdc && (
							<p className="text-xs text-amber-600 dark:text-amber-400">
								You will need to approve the escrow contract to spend your USDC
								before funding.
							</p>
						)}
						<p>
							<span className="text-gray-500 dark:text-gray-400">Deadline:</span>{" "}
							<span className="text-gray-900 dark:text-white font-medium">
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
								<span className="text-gray-500 dark:text-gray-400">Hold-back:</span>{" "}
								<span className="text-gray-900 dark:text-white font-medium">
									{form.holdBack}% (
									{((Number(form.amount) * Number(form.holdBack)) / 100).toFixed(
										isUsdc ? 2 : 6,
									)}{" "}
									{isUsdc ? "USDC" : "ETH"})
								</span>
							</p>
						)}
					</div>
				)}

				{/* Simulation error - shown before MetaMask opens, surfaces revert reason. */}
				{simError !== null && txArgs !== null && (
					<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
						{(simError as { shortMessage?: string }).shortMessage ?? simError.message}
					</p>
				)}

				{writeError !== null && (
					<p className="text-red-500 dark:text-red-400 text-sm rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
						{(writeError as { shortMessage?: string }).shortMessage ??
							writeError.message}
					</p>
				)}

				<button
					type="submit"
					disabled={
						isPending ||
						isConfirming ||
						hasBlockingErrors ||
						(txArgs !== null && simData?.request === undefined && simError === null)
					}
					className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
				>
					{isPending
						? "Waiting for wallet…"
						: isConfirming
							? "Confirming on-chain…"
							: isClientProposing
								? `Create Contract Offer (${isUsdc ? "USDC" : "ETH"})`
								: "Propose Escrow Contract"}
				</button>
			</form>
		</div>
	);
}
