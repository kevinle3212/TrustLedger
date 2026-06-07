"use client";

import type { ArweaveJWK } from "@/lib/arweave";
import type { DocMode, FormFields, UploadStatus } from "../_lib/types";
import { AdvancedOptionsSection } from "./AdvancedOptionsSection";
import { ContractDocumentSection } from "./ContractDocumentSection";
import { PartiesPaymentSection } from "./PartiesPaymentSection";
import { TimelineSection } from "./TimelineSection";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
	docMode: DocMode;
	onDocModeChange: (mode: DocMode) => void;
	isClientProposing: boolean;
	isUsdc: boolean;
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

/** Composes the four contract-form cards: Parties & Payment, Contract Document, Timeline, Advanced Options. */
export function ContractFormFields({
	form,
	set,
	showError,
	markTouched,
	docMode,
	onDocModeChange,
	isClientProposing,
	isUsdc,
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
	return (
		<>
			<PartiesPaymentSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
				isClientProposing={isClientProposing}
				isUsdc={isUsdc}
			/>
			<ContractDocumentSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
				docMode={docMode}
				onDocModeChange={onDocModeChange}
				selectedFile={selectedFile}
				onFileChange={onFileChange}
				encryptEnabled={encryptEnabled}
				onEncryptChange={onEncryptChange}
				passphrase={passphrase}
				onPassphraseChange={onPassphraseChange}
				onPassphraseBlur={onPassphraseBlur}
				pinataJwt={pinataJwt}
				onPinataJwtChange={onPinataJwtChange}
				onPinataJwtBlur={onPinataJwtBlur}
				uploadStatus={uploadStatus}
				uploadError={uploadError}
				onUpload={onUpload}
				arweaveWallet={arweaveWallet}
				arweaveStatus={arweaveStatus}
				arweaveUri={arweaveUri}
				arweaveBalance={arweaveBalance}
				onArweaveWalletLoad={onArweaveWalletLoad}
				onArweaveUpload={onArweaveUpload}
			/>
			<TimelineSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
			/>
			<AdvancedOptionsSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
			/>
		</>
	);
}
