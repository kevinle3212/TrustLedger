import type { ArweaveJWK } from "@/lib/arweave";

export type DocMode = "upload" | "manual";
export type ContractTermsFormat = "markdown" | "html" | "plain";
export type UploadStatus = "idle" | "working" | "done" | "error";
export type PaymentToken = "eth" | "usdc" | "sol";

export interface FormFields {
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

export interface CreateState {
	proposerRole: "freelancer" | "client";
	paymentToken: PaymentToken;
	form: FormFields;
	termsBody: string;
	termsFormat: ContractTermsFormat;
	termsLastUpdatedAt: string | null;
	reviewOpen: boolean;
	magicLinkStatus: "idle" | "sending" | "sent" | "error";
	docMode: DocMode;
	selectedFile: File | null;
	encryptEnabled: boolean;
	passphrase: string;
	pinataJwt: string;
	uploadStatus: UploadStatus;
	uploadError: string | null;
	fileHash: `0x${string}` | null;
	arweaveWallet: ArweaveJWK | null;
	arweaveStatus: UploadStatus;
	arweaveUri: string;
	arweaveBalance: string | null;
	touched: Partial<Record<string, boolean>>;
	submitAttempted: boolean;
}

export type CreateAction =
	| { type: "SET_PROPOSER_ROLE"; role: "freelancer" | "client" }
	| { type: "SET_PAYMENT_TOKEN"; token: PaymentToken }
	| { type: "SET_FIELD"; key: keyof FormFields; value: string }
	| { type: "SET_TERMS_BODY"; value: string }
	| { type: "SET_TERMS_FORMAT"; format: ContractTermsFormat }
	| { type: "HYDRATE_DRAFT"; draft: Partial<CreateState> }
	| { type: "OPEN_REVIEW" }
	| { type: "CLOSE_REVIEW" }
	| { type: "SET_MAGIC_LINK_STATUS"; status: CreateState["magicLinkStatus"] }
	| { type: "SET_DOC_MODE"; mode: DocMode }
	| { type: "FILE_SELECTED"; file: File | null }
	| { type: "SET_ENCRYPT_ENABLED"; enabled: boolean }
	| { type: "SET_PASSPHRASE"; value: string }
	| { type: "SET_PINATA_JWT"; value: string }
	| { type: "UPLOAD_START" }
	| { type: "UPLOAD_SUCCESS"; hash: `0x${string}`; uri: string }
	| { type: "UPLOAD_ERROR"; error: string }
	| { type: "ARWEAVE_WALLET_SET"; wallet: ArweaveJWK }
	| { type: "ARWEAVE_BALANCE_LOADED"; balance: string | null }
	| { type: "ARWEAVE_UPLOAD_START" }
	| { type: "ARWEAVE_UPLOAD_SUCCESS"; uri: string }
	| { type: "ARWEAVE_UPLOAD_ERROR" }
	| { type: "MARK_TOUCHED"; key: string }
	| { type: "SET_SUBMIT_ATTEMPTED" };
