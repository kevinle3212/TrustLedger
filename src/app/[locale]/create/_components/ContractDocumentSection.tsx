"use client";

import type { ArweaveJWK } from "@/lib/arweave";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { useTranslations } from "next-intl";
import type { DocMode, FormFields, UploadStatus } from "../_lib/types";
import { FileUploadPanel } from "./FileUploadPanel";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
	docMode: DocMode;
	onDocModeChange: (mode: DocMode) => void;
	selectedFile: File | null;
	onFileChange: (file: File | null) => void;
	encryptEnabled: boolean;
	onEncryptChange: (enabled: boolean) => void;
	passphrase: string;
	onPassphraseChange: (value: string) => void;
	onPassphraseBlur: () => void;
	pinataJwt: string;
	onPinataJwtChange: (value: string) => void;
	onPinataJwtBlur: () => void;
	uploadStatus: UploadStatus;
	uploadError: string | null;
	onUpload: () => void;
	arweaveWallet: ArweaveJWK | null;
	arweaveStatus: UploadStatus;
	arweaveUri: string;
	arweaveBalance: string | null;
	onArweaveWalletLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onArweaveUpload: () => void;
}

/** Contract Document card — doc mode toggle, file upload panel or manual URI input. */
export function ContractDocumentSection({
	form,
	set,
	showError,
	markTouched,
	docMode,
	onDocModeChange,
	selectedFile,
	onFileChange,
	encryptEnabled,
	onEncryptChange,
	passphrase,
	onPassphraseChange,
	onPassphraseBlur,
	pinataJwt,
	onPinataJwtChange,
	onPinataJwtBlur,
	uploadStatus,
	uploadError,
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
		<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">
					{t("contractDocumentTitle")}
				</h2>
				<div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5">
					{(["upload", "manual"] as DocMode[]).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => {
								onDocModeChange(m);
							}}
							className={`min-h-9 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
								docMode === m
									? "bg-indigo-600 text-white"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{m === "upload" ? t("uploadFile") : t("enterUri")}
						</button>
					))}
				</div>
			</div>

			{docMode === "upload" ? (
				<FileUploadPanel
					selectedFile={selectedFile}
					onFileChange={onFileChange}
					encryptEnabled={encryptEnabled}
					onEncryptChange={onEncryptChange}
					passphrase={passphrase}
					onPassphraseChange={onPassphraseChange}
					onPassphraseBlur={onPassphraseBlur}
					passphraseError={showError("passphrase")}
					pinataJwt={pinataJwt}
					onPinataJwtChange={onPinataJwtChange}
					onPinataJwtBlur={onPinataJwtBlur}
					pinataJwtError={showError("pinataJwt")}
					uploadStatus={uploadStatus}
					uploadError={uploadError}
					contractURI={form.contractURI}
					onUpload={onUpload}
					arweaveWallet={arweaveWallet}
					arweaveStatus={arweaveStatus}
					arweaveUri={arweaveUri}
					arweaveBalance={arweaveBalance}
					onArweaveWalletLoad={onArweaveWalletLoad}
					onArweaveUpload={onArweaveUpload}
				/>
			) : (
				<Field
					label={t("contractDocumentUri")}
					hint={t("contractDocumentUriHint")}
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
	);
}
