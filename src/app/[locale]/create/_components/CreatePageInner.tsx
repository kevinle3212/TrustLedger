"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { useTranslations } from "next-intl";
import { useCreatePageState } from "../_lib/useCreatePageState";
import { ContractFormFields } from "./ContractFormFields";
import { CreateSuccessView } from "./CreateSuccessView";
import { SubmitSummary } from "./SubmitSummary";

export function CreatePageInner(): React.JSX.Element {
	const t = useTranslations("Create");
	const tNav = useTranslations("Nav");
	const {
		state,
		dispatch,
		isConnected,
		isClientProposing,
		isUsdc,
		txHash,
		isPending,
		writeError,
		isConfirming,
		isSuccess,
		receipt,
		usdcAddress,
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
	} = useCreatePageState();

	const {
		proposerRole,
		paymentToken,
		form,
		magicLinkStatus,
		docMode,
		selectedFile,
		encryptEnabled,
		passphrase,
		pinataJwt,
		uploadStatus,
		uploadError,
		arweaveWallet,
		arweaveStatus,
		arweaveUri,
		arweaveBalance,
	} = state;

	if (!isConnected) {
		return (
			<div className="flex flex-col items-center justify-center gap-6 py-32">
				<p className="text-gray-500 dark:text-gray-400 text-lg">{t("connectWallet")}</p>
				<ConnectButton />
			</div>
		);
	}

	if (isSuccess && receipt !== undefined) {
		return (
			<CreateSuccessView
				txHash={txHash}
				blockNumber={receipt.blockNumber}
				isClientProposing={isClientProposing}
				clientEmail={form.clientEmail}
				magicLinkStatus={magicLinkStatus}
				onCreateAnother={() => {
					window.location.reload();
				}}
			/>
		);
	}

	return (
		<div className="max-w-2xl mx-auto px-6 py-12">
			<div className="mb-8">
				<h1 className="text-3xl font-bold">
					{isClientProposing ? t("titleClient") : t("titleFreelancer")}
				</h1>
				<p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
					{isClientProposing
						? t("subtitleClient")
						: t("subtitleFreelancer", { token: isUsdc ? "USDC" : "ETH" })}
				</p>
			</div>

			{/* Role toggle */}
			<div className="mb-6 flex items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">{t("iAmThe")}</span>
				<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
					{(["freelancer", "client"] as const).map((r) => (
						<button
							key={r}
							type="button"
							onClick={() => {
								dispatch({ type: "SET_PROPOSER_ROLE", role: r });
							}}
							className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
								proposerRole === r
									? "bg-indigo-600 text-white"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{r === "client" ? tNav("roleClient") : tNav("roleFreelancer")}
						</button>
					))}
				</div>
				{isClientProposing && (
					<span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
						{t("bewareWarning")}
					</span>
				)}
			</div>

			{/* Currency selector */}
			<div className="mb-6 flex items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">
					{t("paymentCurrency")}
				</span>
				<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1">
					{(["eth", "usdc"] as const).map((token) => (
						<button
							key={token}
							type="button"
							onClick={() => {
								dispatch({ type: "SET_PAYMENT_TOKEN", token });
							}}
							className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors uppercase ${
								paymentToken === token
									? "bg-indigo-600 text-white"
									: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
							}`}
						>
							{token}
						</button>
					))}
				</div>
				{isUsdc && usdcAddress === undefined && (
					<span className="text-xs text-red-500 dark:text-red-400">
						{t("usdcNotSupported")}
					</span>
				)}
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				<ContractFormFields
					form={form}
					set={set}
					showError={showError}
					markTouched={markTouched}
					docMode={docMode}
					onDocModeChange={(mode) => {
						dispatch({ type: "SET_DOC_MODE", mode });
					}}
					isClientProposing={isClientProposing}
					isUsdc={isUsdc}
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
					pinataJwt={pinataJwt}
					onPinataJwtChange={(value) => {
						dispatch({ type: "SET_PINATA_JWT", value });
					}}
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
					txStatus={isPending ? "pending" : isConfirming ? "confirming" : "idle"}
					hasBlockingErrors={hasBlockingErrors}
					submitAttempted={state.submitAttempted}
					missingFieldLabels={missingFieldLabels}
					proposerRole={proposerRole}
				/>
			</form>
		</div>
	);
}
