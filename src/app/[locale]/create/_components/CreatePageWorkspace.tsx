"use client";

import type { useCreatePageState } from "../_lib/useCreatePageState";
import { ContractDocumentSection } from "./ContractDocumentSection";
import { ContractFormFields } from "./ContractFormFields";
import { ContractLivePreview } from "./ContractLivePreview";
import { ReviewConfirmationPanel } from "./ReviewConfirmationPanel";
import { SecureDraftSessionPanel } from "./SecureDraftSessionPanel";
import { SubmitSummary } from "./SubmitSummary";

type CreatePageState = ReturnType<typeof useCreatePageState>;

export function CreatePageWorkspace({
	page,
}: {
	readonly page: CreatePageState;
}): React.JSX.Element {
	const {
		state,
		dispatch,
		address,
		isClientProposing,
		isConnected,
		isPending,
		isConfirming,
		isSuccess,
		writeError,
		solanaTxStatus,
		solanaError,
		solanaWalletAddress,
		solanaProgramReady,
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
		handleConfirmDeploy,
		applySharedDraft,
	} = page;
	const {
		proposerRole,
		paymentToken,
		form,
		docMode,
		selectedFile,
		encryptEnabled,
		passphrase,
		uploadStatus,
		uploadError,
		arweaveWallet,
		arweaveStatus,
		arweaveUri,
		arweaveBalance,
		reviewOpen,
	} = state;
	const txStatus =
		paymentToken === "sol"
			? solanaTxStatus === "connecting" || solanaTxStatus === "pending"
				? "pending"
				: solanaTxStatus === "simulating" || solanaTxStatus === "confirming"
					? "confirming"
					: "idle"
			: isPending
				? "pending"
				: isConfirming
					? "confirming"
					: "idle";

	return (
		<div className="tl-workspace-grid">
			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				<SecureDraftSessionPanel
					state={state}
					connectedWallet={address}
					submissionComplete={isSuccess || solanaTxStatus === "success"}
					onTermsBodyChange={(value) => {
						dispatch({ type: "SET_TERMS_BODY", value });
					}}
					onTermsFormatChange={(format) => {
						dispatch({ type: "SET_TERMS_FORMAT", format });
					}}
					onImportDraft={applySharedDraft}
				/>
				<ContractDocumentSection
					form={form}
					set={set}
					showError={showError}
					markTouched={markTouched}
					docMode={docMode}
					onDocModeChange={(mode) => {
						dispatch({ type: "SET_DOC_MODE", mode });
					}}
					selectedFile={selectedFile}
					onFileChange={(file) => {
						dispatch({ type: "FILE_SELECTED", file });
					}}
					encryptEnabled={encryptEnabled}
					onEncryptChange={(enabled) => {
						dispatch({ type: "SET_ENCRYPT_ENABLED", enabled });
					}}
					passphrase={passphrase}
					onPassphraseChange={(value) => {
						dispatch({ type: "SET_PASSPHRASE", value });
					}}
					onPassphraseBlur={() => {
						markTouched("passphrase");
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
				<ContractFormFields
					form={form}
					set={set}
					showError={showError}
					markTouched={markTouched}
					isClientProposing={isClientProposing}
					paymentToken={paymentToken}
				/>
				<SubmitSummary
					amount={form.amount}
					token={paymentToken}
					estimatedDurationDays={form.estimatedDurationDays}
					bufferFactor={form.bufferFactor}
					holdBack={form.holdBack}
					simError={simError}
					decodedSimError={decodedSimError}
					simStatus={
						txArgs === null
							? "idle"
							: simData?.request !== undefined
								? "ready"
								: "loading"
					}
					writeError={writeError}
					solanaError={solanaError}
					solanaWalletAddress={solanaWalletAddress}
					solanaProgramReady={solanaProgramReady}
					isEvmConnected={isConnected}
					txStatus={txStatus}
					hasBlockingErrors={hasBlockingErrors}
					submitAttempted={state.submitAttempted}
					missingFieldLabels={missingFieldLabels}
					proposerRole={proposerRole}
				/>
				<ReviewConfirmationPanel
					open={reviewOpen}
					form={form}
					paymentToken={paymentToken}
					isClientProposing={isClientProposing}
					txReady={
						paymentToken === "sol"
							? solanaProgramReady && !hasBlockingErrors
							: simData?.request !== undefined
					}
					txStatus={txStatus}
					onCancel={() => {
						dispatch({ type: "CLOSE_REVIEW" });
					}}
					onConfirm={handleConfirmDeploy}
				/>
			</form>
			<ContractLivePreview
				form={form}
				paymentToken={paymentToken}
				isClientProposing={isClientProposing}
				termsBody={state.termsBody}
				termsFormat={state.termsFormat}
				termsLastUpdatedAt={state.termsLastUpdatedAt}
			/>
		</div>
	);
}
