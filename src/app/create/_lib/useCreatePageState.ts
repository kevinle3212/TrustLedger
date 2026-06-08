import { useEffect, useMemo, useReducer, useRef } from "react";
import {
	useAccount,
	useChainId,
	useWriteContract,
	useSimulateContract,
	useWaitForTransactionReceipt,
} from "wagmi";
import {
	type TransactionReceipt,
	parseEther,
	parseUnits,
	keccak256,
	toBytes,
	parseEventLogs,
} from "viem";
import { TRUSTLEDGER_ABI } from "@/lib/abi";
import { TRUSTLEDGER_ADDRESS, getUsdcAddress } from "@/lib/wagmi";
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
import { decodeContractError, type DecodedContractError } from "@/lib/contractErrors";
import type { CreateState, FormFields } from "./types";
import { createReducer } from "./reducer";

export function useCreatePageState(): {
	state: CreateState;
	dispatch: React.Dispatch<Parameters<typeof createReducer>[1]>;
	isConnected: boolean;
	chainId: number;
	usdcAddress: `0x${string}` | undefined;
	isClientProposing: boolean;
	isUsdc: boolean;
	txHash: `0x${string}` | undefined;
	isPending: boolean;
	writeError: Error | null;
	isConfirming: boolean;
	isSuccess: boolean;
	receipt: TransactionReceipt | undefined;
	simData: { request: unknown } | undefined;
	simError: Error | null;
	decodedSimError: DecodedContractError | null;
	missingFieldLabels: string[];
	txArgs: {
		functionName: "proposeContractByClient" | "proposeContract";
		address: `0x${string}`;
		abi: typeof TRUSTLEDGER_ABI;
		args: readonly unknown[];
	} | null;
	hasBlockingErrors: boolean;
	set: (key: keyof FormFields, value: string) => void;
	markTouched: (key: string) => void;
	showError: (key: string) => string | undefined;
	handleSubmit: (e: React.SyntheticEvent) => void;
	handleUploadToIPFS: () => Promise<void>;
	handleArweaveWalletLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleArweaveUpload: () => Promise<void>;
} {
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

	const [state, dispatch] = useReducer(
		createReducer,
		globalRole,
		(role): CreateState => ({
			proposerRole: role,
			paymentToken: "eth" as const,
			form: {
				client: "",
				clientEmail: "",
				amount: "",
				contractURI: "",
				estimatedDurationDays: "30",
				bufferFactor: "1200",
				acceptanceWindowDays: "3",
				arbitrationFeePct: "5",
				holdBack: "none" as const,
				warrantyPeriodDays: "30",
			},
			magicLinkStatus: "idle" as const,
			docMode: "upload",
			selectedFile: null,
			encryptEnabled: false,
			passphrase: "",
			pinataJwt: process.env["NEXT_PUBLIC_PINATA_JWT"] ?? "",
			uploadStatus: "idle",
			uploadError: null,
			fileHash: null,
			arweaveWallet: null,
			arweaveStatus: "idle",
			arweaveUri: "",
			arweaveBalance: null,
			touched: {},
			submitAttempted: false,
		}),
	);

	const {
		proposerRole,
		paymentToken,
		form,
		encryptEnabled,
		passphrase,
		pinataJwt,
		docMode,
		selectedFile,
		fileHash,
		arweaveWallet,
		touched,
		submitAttempted,
	} = state;

	const isClientProposing = proposerRole === "client";
	const isUsdc = paymentToken === "usdc";

	const uploadedBytes = useRef<Uint8Array<ArrayBuffer> | null>(null);
	const uploadedMime = useRef("application/octet-stream");

	function set(key: keyof FormFields, value: string): void {
		dispatch({ type: "SET_FIELD", key, value });
	}

	function markTouched(key: string): void {
		dispatch({ type: "MARK_TOUCHED", key });
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
			arbitrationFeePct: validateNumberInRange(form.arbitrationFeePct, 0.01, 50),
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

	function showError(key: string): string | undefined {
		return touched[key] === true || submitAttempted
			? fieldErrors[key as keyof typeof fieldErrors]
			: undefined;
	}

	const hasBlockingErrors = Object.values(fieldErrors).some((e) => e !== undefined);

	const FIELD_LABELS: Record<string, string> = {
		client: "client address",
		clientEmail: "client email",
		amount: "escrow amount",
		contractURI: "contract document",
		paymentToken: "payment token",
		estimatedDurationDays: "estimated duration",
		bufferFactor: "buffer factor",
		acceptanceWindowDays: "acceptance window",
		arbitrationFeePct: "arbitration fee",
		warrantyPeriodDays: "warranty period",
		pinataJwt: "Pinata JWT",
		passphrase: "passphrase",
	};

	const missingFieldLabels = useMemo(
		() =>
			Object.entries(fieldErrors)
				.filter(([, v]) => v !== undefined)
				.map(([k]) => FIELD_LABELS[k] ?? k),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[fieldErrors],
	);

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
			return {
				address: TRUSTLEDGER_ADDRESS,
				abi: TRUSTLEDGER_ABI,
				functionName: "proposeContractByClient" as const,
				args: [form.client as `0x${string}`, ...sharedArgs] as const,
			};
		}
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
		query: { enabled: clientTxArgs !== null && !hasBlockingErrors },
	});
	const { data: freelancerSimData, error: freelancerSimError } = useSimulateContract({
		address: TRUSTLEDGER_ADDRESS,
		abi: TRUSTLEDGER_ABI,
		functionName: "proposeContract",
		args: freelancerTxArgs?.args,
		query: { enabled: freelancerTxArgs !== null && !hasBlockingErrors },
	});
	const simData = clientSimData ?? freelancerSimData;
	const simError = clientSimError ?? freelancerSimError;
	const decodedSimError = decodeContractError(simError);

	function handleSubmit(e: React.SyntheticEvent): void {
		e.preventDefault();
		dispatch({ type: "SET_SUBMIT_ATTEMPTED" });
		if (hasBlockingErrors) return;
		if (simData?.request !== undefined) {
			writeContract(simData.request as Parameters<typeof writeContract>[0]);
		}
	}

	useEffect(() => {
		if (!isSuccess || form.clientEmail === "") return;

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
				dispatch({ type: "SET_MAGIC_LINK_STATUS", status: r.ok ? "sent" : "error" });
			})
			.catch(() => {
				dispatch({ type: "SET_MAGIC_LINK_STATUS", status: "error" });
			});
	}, [isSuccess, receipt, form.clientEmail, form.client, isClientProposing]);

	async function handleUploadToIPFS(): Promise<void> {
		if (selectedFile === null) return;
		if (pinataJwt === "") {
			dispatch({
				type: "UPLOAD_ERROR",
				error: "Enter your Pinata JWT to enable IPFS upload.",
			});
			return;
		}
		dispatch({ type: "UPLOAD_START" });
		try {
			const rawBytes = new Uint8Array(await selectedFile.arrayBuffer());
			let bytes: Uint8Array<ArrayBuffer>;
			let mime: string;
			if (encryptEnabled) {
				if (passphrase === "") throw new Error("Passphrase required for encryption.");
				bytes = await encryptFile(rawBytes.buffer, passphrase);
				mime = "application/octet-stream";
			} else {
				bytes = new Uint8Array(rawBytes.buffer);
				mime = selectedFile.type !== "" ? selectedFile.type : "application/octet-stream";
			}
			const hash = keccak256(bytes);
			const blob = new Blob([bytes.buffer], { type: mime });
			const uri = await uploadToPinata(blob, selectedFile.name, pinataJwt);
			uploadedBytes.current = bytes;
			uploadedMime.current = mime;
			dispatch({ type: "UPLOAD_SUCCESS", hash, uri });
		} catch (err) {
			dispatch({
				type: "UPLOAD_ERROR",
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	function handleArweaveWalletLoad(e: React.ChangeEvent<HTMLInputElement>): void {
		const file = e.target.files?.[0];
		if (file === undefined) return;
		const reader = new FileReader();
		reader.onload = async (ev): Promise<void> => {
			try {
				const jwk = JSON.parse(ev.target?.result as string) as ArweaveJWK;
				dispatch({ type: "ARWEAVE_WALLET_SET", wallet: jwk });
				const { getArweaveBalance } = await import("@/lib/arweave");
				const bal = await getArweaveBalance(jwk);
				dispatch({ type: "ARWEAVE_BALANCE_LOADED", balance: bal });
			} catch {
				// ignore parse errors - bad wallet file
			}
		};
		reader.readAsText(file);
	}

	async function handleArweaveUpload(): Promise<void> {
		if (uploadedBytes.current === null || arweaveWallet === null) return;
		dispatch({ type: "ARWEAVE_UPLOAD_START" });
		try {
			const { uploadToArweave } = await import("@/lib/arweave");
			const uri = await uploadToArweave(
				uploadedBytes.current,
				uploadedMime.current,
				arweaveWallet,
			);
			dispatch({ type: "ARWEAVE_UPLOAD_SUCCESS", uri });
		} catch {
			dispatch({ type: "ARWEAVE_UPLOAD_ERROR" });
		}
	}

	return {
		state,
		dispatch,
		isConnected,
		chainId,
		usdcAddress,
		isClientProposing,
		isUsdc,
		txHash,
		isPending,
		writeError,
		isConfirming,
		isSuccess,
		receipt,
		simData,
		simError,
		decodedSimError,
		missingFieldLabels,
		txArgs,
		hasBlockingErrors,
		set,
		markTouched,
		showError,
		handleSubmit,
		handleUploadToIPFS,
		handleArweaveWalletLoad,
		handleArweaveUpload,
	};
}
