"use client";

import type { ArweaveJWK } from "@/lib/arweave";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { useTranslations } from "next-intl";
import { EncryptionOptions } from "./EncryptionOptions";
import { ArweaveBackupPanel } from "./ArweaveBackupPanel";

type UploadStatus = "idle" | "working" | "done" | "error";

interface Props {
	selectedFile: File | null;
	onFileChange: (file: File | null) => void;
	encryptEnabled: boolean;
	onEncryptChange: (enabled: boolean) => void;
	passphrase: string;
	onPassphraseChange: (value: string) => void;
	onPassphraseBlur: () => void;
	passphraseError: string | undefined;
	pinataJwt: string;
	onPinataJwtChange: (value: string) => void;
	onPinataJwtBlur: () => void;
	pinataJwtError: string | undefined;
	uploadStatus: UploadStatus;
	uploadError: string | null;
	contractURI: string;
	onUpload: () => void;
	arweaveWallet: ArweaveJWK | null;
	arweaveStatus: UploadStatus;
	arweaveUri: string;
	arweaveBalance: string | null;
	onArweaveWalletLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onArweaveUpload: () => void;
}

/** File picker with optional encryption, IPFS upload, and Arweave backup. */
export function FileUploadPanel({
	selectedFile,
	onFileChange,
	encryptEnabled,
	onEncryptChange,
	passphrase,
	onPassphraseChange,
	onPassphraseBlur,
	passphraseError,
	pinataJwt,
	onPinataJwtChange,
	onPinataJwtBlur,
	pinataJwtError,
	uploadStatus,
	uploadError,
	contractURI,
	onUpload,
	arweaveWallet,
	arweaveStatus,
	arweaveUri,
	arweaveBalance,
	onArweaveWalletLoad,
	onArweaveUpload,
}: Props): React.JSX.Element {
	const t = useTranslations("Create");

	return (
		<div className="flex flex-col gap-3">
			{/* File picker */}
			<label className="flex flex-col items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-indigo-500/50 cursor-pointer transition-colors">
				<input
					type="file"
					className="sr-only"
					onChange={(e) => {
						onFileChange(e.target.files?.[0] ?? null);
					}}
				/>
				<span className="text-sm text-gray-500 dark:text-gray-400">
					{selectedFile !== null ? selectedFile.name : t("clickToBrowse")}
				</span>
				{selectedFile !== null && (
					<span className="text-xs text-gray-500">
						{(selectedFile.size / 1024).toFixed(1)} KB
					</span>
				)}
			</label>

			<EncryptionOptions
				enabled={encryptEnabled}
				onEnabledChange={onEncryptChange}
				passphrase={passphrase}
				onPassphraseChange={onPassphraseChange}
				onPassphraseBlur={onPassphraseBlur}
				passphraseError={passphraseError}
			/>

			{/* Pinata JWT - shown if not baked in via env */}
			{(process.env.NEXT_PUBLIC_PINATA_JWT === undefined ||
				process.env.NEXT_PUBLIC_PINATA_JWT === "") && (
				<Field label={t("pinataJwt")} hint={t("pinataJwtHint")} error={pinataJwtError}>
					<Input
						type="password"
						placeholder="eyJhbGciOiJIUzI1NiIs…"
						value={pinataJwt}
						onChange={(e) => {
							onPinataJwtChange(e.target.value);
						}}
						onBlur={onPinataJwtBlur}
						error={pinataJwtError !== undefined}
					/>
				</Field>
			)}

			{/* Upload button */}
			<button
				type="button"
				onClick={onUpload}
				disabled={
					selectedFile === null ||
					uploadStatus === "working" ||
					(encryptEnabled && passphrase === "") ||
					pinataJwt === ""
				}
				className="px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
			>
				{uploadStatus === "working" ? t("uploading") : t("uploadToIpfs")}
			</button>

			{/* Upload result */}
			{uploadStatus === "done" && contractURI !== "" && (
				<div className="flex flex-col gap-3">
					<div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600 dark:text-green-300">
						<span className="shrink-0 mt-0.5">✓</span>
						<span className="font-mono break-all">{contractURI}</span>
					</div>

					<ArweaveBackupPanel
						arweaveWallet={arweaveWallet}
						arweaveStatus={arweaveStatus}
						arweaveUri={arweaveUri}
						arweaveBalance={arweaveBalance}
						onArweaveWalletLoad={onArweaveWalletLoad}
						onArweaveUpload={onArweaveUpload}
					/>
				</div>
			)}

			{uploadStatus === "error" && uploadError !== null && uploadError !== "" && (
				<p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
					{uploadError}
				</p>
			)}
		</div>
	);
}
