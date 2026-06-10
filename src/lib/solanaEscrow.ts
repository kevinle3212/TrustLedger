"use client";

import {
	Connection,
	PublicKey,
	SYSVAR_RENT_PUBKEY,
	SystemProgram,
	Transaction,
	TransactionInstruction,
	TransactionMessage,
	VersionedTransaction,
	type Commitment,
} from "@solana/web3.js";
import { keccak256, toBytes } from "viem";
import {
	getSolanaExplorerTxUrl,
	getSolanaNetworkConfig,
	resolveSolanaCluster,
	type SolanaCluster,
} from "@/helpers/solana";
import { daysToSeconds } from "@/lib/utils";
import type { FormFields } from "@/app/[locale]/create/_lib/types";

const TRUSTLEDGER_SOLANA_PROGRAM_ID_ENV = "NEXT_PUBLIC_SOLANA_PROGRAM_ID";
const TRUSTLEDGER_SOLANA_ESCROW_SEED = "trustledger_escrow";
const TRUSTLEDGER_SOLANA_CREATE_ESCROW_DISCRIMINATOR = 0;

type PublicKeyLike = PublicKey | string | { toBase58: () => string };

export interface TrustLedgerSolanaWallet {
	readonly publicKey?: PublicKeyLike | null;
	readonly connect?: (options?: {
		onlyIfTrusted?: boolean;
	}) => Promise<{ publicKey: PublicKeyLike }>;
	readonly signTransaction?: (transaction: Transaction) => Promise<Transaction>;
	readonly signAndSendTransaction?: (
		transaction: Transaction,
	) => Promise<{ signature: string } | string>;
}

export interface SolanaEscrowBuildInput {
	readonly form: FormFields;
	readonly proposerRole: "client" | "freelancer";
	readonly payerAddress: string;
	readonly fileHash: `0x${string}` | null;
	readonly programId?: PublicKey;
}

export interface SolanaEscrowTransactionDraft {
	readonly transaction: Transaction;
	readonly escrowAddress: string;
	readonly programId: string;
	readonly amountLamports: bigint;
	readonly contractHash: `0x${string}`;
}

export interface SolanaEscrowSubmissionResult {
	readonly signature: string;
	readonly explorerUrl: string;
	readonly escrowAddress: string;
	readonly programId: string;
}

export function getConfiguredSolanaCluster(): SolanaCluster {
	return resolveSolanaCluster(process.env["NEXT_PUBLIC_SOLANA_CLUSTER"]);
}

function getConfiguredSolanaRpcUrl(): string {
	return (
		process.env["NEXT_PUBLIC_SOLANA_RPC_URL"] ??
		getSolanaNetworkConfig(getConfiguredSolanaCluster()).rpcUrl
	);
}

export function getTrustLedgerSolanaProgramId(): PublicKey | null {
	const rawProgramId = process.env["NEXT_PUBLIC_SOLANA_PROGRAM_ID"]?.trim();
	if (rawProgramId === undefined || rawProgramId === "") return null;
	try {
		return new PublicKey(rawProgramId);
	} catch {
		return null;
	}
}

export function getInjectedSolanaWallet(): TrustLedgerSolanaWallet | null {
	if (typeof window === "undefined") return null;
	const candidateWindow = window as typeof window & {
		solana?: TrustLedgerSolanaWallet;
		phantom?: { solana?: TrustLedgerSolanaWallet };
	};
	return candidateWindow.phantom?.solana ?? candidateWindow.solana ?? null;
}

export function normalizeSolanaPublicKey(value: PublicKeyLike): PublicKey {
	if (value instanceof PublicKey) return value;
	if (typeof value === "string") return new PublicKey(value);
	return new PublicKey(value.toBase58());
}

export function parseSolToLamports(value: string): bigint {
	const trimmed = value.trim();
	if (!/^\d+(?:\.\d+)?$/u.test(trimmed)) {
		throw new Error("Enter a valid SOL amount.");
	}
	const parts = trimmed.split(".");
	const whole = parts[0] ?? "0";
	const fraction = parts[1] ?? "";
	if (fraction.length > 9) {
		throw new Error("SOL supports up to 9 decimal places.");
	}
	const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, "0"));
	if (lamports <= 0n) {
		throw new Error("Amount must be greater than 0 SOL.");
	}
	return lamports;
}

function deriveTrustLedgerEscrowPda(params: {
	readonly programId: PublicKey;
	readonly payer: PublicKey;
	readonly counterparty: PublicKey;
	readonly contractHash: Uint8Array;
}): PublicKey {
	const [pda] = PublicKey.findProgramAddressSync(
		[
			new TextEncoder().encode(TRUSTLEDGER_SOLANA_ESCROW_SEED),
			params.payer.toBuffer(),
			params.counterparty.toBuffer(),
			params.contractHash,
		],
		params.programId,
	);
	return pda;
}

function hexToBytes32(value: `0x${string}`): Uint8Array {
	const hex = value.slice(2);
	if (!/^[0-9a-fA-F]{64}$/u.test(hex)) {
		throw new Error("Expected a 32-byte hex hash.");
	}
	const bytes = new Uint8Array(32);
	for (let i = 0; i < bytes.length; i += 1) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function writeU16Le(target: Uint8Array, offset: number, value: number): void {
	target.set([value & 0xff, (value >> 8) & 0xff], offset);
}

function writeU64Le(target: Uint8Array, offset: number, value: bigint): void {
	const bytes = new Uint8Array(8);
	for (let i = 0; i < 8; i += 1) {
		bytes[i] = Number((value >> BigInt(i * 8)) & 0xffn);
	}
	target.set(bytes, offset);
}

export function encodeCreateSolanaEscrowInstruction(params: {
	readonly amountLamports: bigint;
	readonly durationSeconds: bigint;
	readonly acceptanceWindowSeconds: bigint;
	readonly arbitrationFeeBps: number;
	readonly holdBackBps: number;
	readonly warrantySeconds: bigint;
	readonly contractHash: Uint8Array;
	readonly proposerRole: "client" | "freelancer";
	readonly contractUri: string;
}): Uint8Array {
	if (params.contractHash.byteLength !== 32) {
		throw new Error("Contract hash must be 32 bytes.");
	}
	const uriBytes = new TextEncoder().encode(params.contractUri);
	if (uriBytes.byteLength > 1024) {
		throw new Error("Contract URI is too long for the Solana escrow instruction.");
	}
	const data = new Uint8Array(1 + 8 + 8 + 8 + 2 + 2 + 8 + 32 + 1 + 2 + uriBytes.byteLength);
	let offset = 0;
	data[offset] = TRUSTLEDGER_SOLANA_CREATE_ESCROW_DISCRIMINATOR;
	offset += 1;
	writeU64Le(data, offset, params.amountLamports);
	offset += 8;
	writeU64Le(data, offset, params.durationSeconds);
	offset += 8;
	writeU64Le(data, offset, params.acceptanceWindowSeconds);
	offset += 8;
	writeU16Le(data, offset, params.arbitrationFeeBps);
	offset += 2;
	writeU16Le(data, offset, params.holdBackBps);
	offset += 2;
	writeU64Le(data, offset, params.warrantySeconds);
	offset += 8;
	data.set(params.contractHash, offset);
	offset += 32;
	data[offset] = params.proposerRole === "client" ? 1 : 0;
	offset += 1;
	writeU16Le(data, offset, uriBytes.byteLength);
	offset += 2;
	data.set(uriBytes, offset);
	return data;
}

export function buildCreateSolanaEscrowTransaction(
	input: SolanaEscrowBuildInput,
): SolanaEscrowTransactionDraft {
	const programId = input.programId ?? getTrustLedgerSolanaProgramId();
	if (programId === null) {
		throw new Error(
			`Set ${TRUSTLEDGER_SOLANA_PROGRAM_ID_ENV} to the deployed TrustLedger Solana escrow program ID.`,
		);
	}

	const payer = new PublicKey(input.payerAddress.trim());
	const counterparty = new PublicKey(input.form.client.trim());
	const contractUri = input.form.contractURI.trim();
	const contractHash = input.fileHash ?? keccak256(toBytes(contractUri));
	const contractHashBytes = hexToBytes32(contractHash);
	const escrowPda = deriveTrustLedgerEscrowPda({
		programId,
		payer,
		counterparty,
		contractHash: contractHashBytes,
	});
	const amountLamports = parseSolToLamports(input.form.amount);
	const holdBackBps = input.form.holdBack === "none" ? 0 : Number(input.form.holdBack) * 100;
	const data = encodeCreateSolanaEscrowInstruction({
		amountLamports,
		durationSeconds: daysToSeconds(Number(input.form.estimatedDurationDays)),
		acceptanceWindowSeconds: daysToSeconds(Number(input.form.acceptanceWindowDays)),
		arbitrationFeeBps: Math.round(Number(input.form.arbitrationFeePct) * 100),
		holdBackBps,
		warrantySeconds:
			input.form.holdBack === "none"
				? 0n
				: BigInt(Number(input.form.warrantyPeriodDays) * 86400),
		contractHash: contractHashBytes,
		proposerRole: input.proposerRole,
		contractUri,
	});
	const instruction = new TransactionInstruction({
		programId,
		keys: [
			{ pubkey: payer, isSigner: true, isWritable: true },
			{ pubkey: counterparty, isSigner: false, isWritable: false },
			{ pubkey: escrowPda, isSigner: false, isWritable: true },
			{ pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
			{ pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
		],
		data: Buffer.from(data),
	});
	return {
		transaction: new Transaction().add(instruction),
		escrowAddress: escrowPda.toBase58(),
		programId: programId.toBase58(),
		amountLamports,
		contractHash,
	};
}

export async function submitCreateSolanaEscrowTransaction(params: {
	readonly wallet: TrustLedgerSolanaWallet;
	readonly draft: SolanaEscrowTransactionDraft;
	readonly commitment?: Commitment;
	readonly cluster?: SolanaCluster;
	readonly rpcUrl?: string;
}): Promise<SolanaEscrowSubmissionResult> {
	const walletPublicKey = params.wallet.publicKey;
	if (walletPublicKey === undefined || walletPublicKey === null) {
		throw new Error("Connect a Solana wallet before submitting.");
	}
	const cluster = params.cluster ?? getConfiguredSolanaCluster();
	const connection = new Connection(
		params.rpcUrl ?? getConfiguredSolanaRpcUrl(),
		params.commitment ?? "confirmed",
	);
	const payer = normalizeSolanaPublicKey(walletPublicKey);
	const latestBlockhash = await connection.getLatestBlockhash(params.commitment ?? "confirmed");
	const transaction = params.draft.transaction;
	transaction.feePayer = payer;
	transaction.recentBlockhash = latestBlockhash.blockhash;

	const simulationMessage = new TransactionMessage({
		payerKey: payer,
		recentBlockhash: latestBlockhash.blockhash,
		instructions: transaction.instructions,
	}).compileToV0Message();
	const simulationTransaction = new VersionedTransaction(simulationMessage);
	const simulation = await connection.simulateTransaction(simulationTransaction, {
		sigVerify: false,
		replaceRecentBlockhash: false,
	});
	if (simulation.value.err !== null) {
		throw new Error(`Solana simulation failed: ${JSON.stringify(simulation.value.err)}`);
	}

	let signature: string;
	if (params.wallet.signAndSendTransaction !== undefined) {
		const result = await params.wallet.signAndSendTransaction(transaction);
		signature = typeof result === "string" ? result : result.signature;
	} else if (params.wallet.signTransaction !== undefined) {
		const signed = await params.wallet.signTransaction(transaction);
		signature = await connection.sendRawTransaction(signed.serialize());
	} else {
		throw new Error("Your Solana wallet does not support transaction signing.");
	}

	await connection.confirmTransaction(
		{
			signature,
			blockhash: latestBlockhash.blockhash,
			lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
		},
		params.commitment ?? "confirmed",
	);

	return {
		signature,
		explorerUrl: getSolanaExplorerTxUrl(signature, cluster),
		escrowAddress: params.draft.escrowAddress,
		programId: params.draft.programId,
	};
}
