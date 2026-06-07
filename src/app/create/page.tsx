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
import { ContractFormFields } from "./_components/ContractFormFields";
import { SubmitSummary } from "./_components/SubmitSummary";

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
				<ContractFormFields
					form={form}
					set={set}
					showError={showError as (key: string) => string | undefined}
					markTouched={markTouched}
					docMode={docMode}
					onDocModeChange={setDocMode}
					isClientProposing={isClientProposing}
					isUsdc={isUsdc}
					selectedFile={selectedFile}
					onFileChange={(file) => {
						setSelectedFile(file);
						setUploadStatus("idle");
						setFileHash(null);
						uploadedBytes.current = null;
					}}
					encryptEnabled={encryptEnabled}
					onEncryptChange={setEncryptEnabled}
					passphrase={passphrase}
					onPassphraseChange={setPassphrase}
					onPassphraseBlur={() => {
						markTouched("passphrase");
					}}
					pinataJwt={pinataJwt}
					onPinataJwtChange={setPinataJwt}
					onPinataJwtBlur={() => {
						markTouched("pinataJwt");
					}}
					uploadStatus={uploadStatus}
					uploadError={uploadError}
					onUpload={() => {
						void handleUploadToIPFS();
					}}
					arweaveWallet={arweaveWallet}
					arweaveStatus={arweaveStatus}
					arweaveUri={arweaveUri}
					arweaveBalance={arweaveBalance}
					onArweaveWalletLoad={handleArweaveWalletLoad}
					onArweaveUpload={() => {
						void handleArweaveUpload();
					}}
				/>

				<SubmitSummary
					amount={form.amount}
					isUsdc={isUsdc}
					estimatedDurationDays={form.estimatedDurationDays}
					bufferFactor={form.bufferFactor}
					holdBack={form.holdBack}
					simError={simError}
					txArgsReady={txArgs !== null}
					writeError={writeError}
					isPending={isPending}
					isConfirming={isConfirming}
					hasBlockingErrors={hasBlockingErrors}
					simDataReady={simData?.request !== undefined}
					isClientProposing={isClientProposing}
				/>
			</form>
		</div>
	);
}
