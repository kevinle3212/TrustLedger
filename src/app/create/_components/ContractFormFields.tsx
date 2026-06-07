"use client";

import type { ArweaveJWK } from "@/lib/arweave";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { FileUploadPanel } from "./FileUploadPanel";

type DocMode = "upload" | "manual";
type UploadStatus = "idle" | "working" | "done" | "error";

interface FormState {
	client: string;
	clientEmail: string;
	amount: string;
	contractURI: string;
	estimatedDurationDays: string;
	bufferFactor: string;
	acceptanceWindowDays: string;
	arbitrationFeePct: string;
	holdBack: "none" | "5" | "10" | "15";
	warrantyPeriodDays: string;
}

interface Props {
	form: FormState;
	set: (key: keyof FormState, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
	docMode: DocMode;
	onDocModeChange: (mode: DocMode) => void;
	isClientProposing: boolean;
	isUsdc: boolean;
	// FileUploadPanel props
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

/** The four form card sections: Parties & Payment, Contract Document, Timeline, Advanced Options. */
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
									onDocModeChange(m);
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

			{/* Advanced Options */}
			<div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 flex flex-col gap-4">
				<h2 className="font-semibold text-gray-900 dark:text-white">Advanced Options</h2>

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
		</>
	);
}
