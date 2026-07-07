import type { CreateState, CreateAction } from "./types";

export function createReducer(state: CreateState, action: CreateAction): CreateState {
	switch (action.type) {
		case "SET_PROPOSER_ROLE":
			return { ...state, proposerRole: action.role };
		case "SET_PAYMENT_TOKEN":
			return { ...state, paymentToken: action.token, form: { ...state.form, amount: "" } };
		case "SET_FIELD":
			return { ...state, form: { ...state.form, [action.key]: action.value } };
		case "SET_TERMS_BODY":
			return {
				...state,
				termsBody: action.value,
				termsLastUpdatedAt: new Date().toISOString(),
			};
		case "SET_TERMS_FORMAT":
			return {
				...state,
				termsFormat: action.format,
				termsLastUpdatedAt: new Date().toISOString(),
			};
		case "HYDRATE_DRAFT":
			return {
				...state,
				...action.draft,
				form: { ...state.form, ...action.draft.form },
				reviewOpen: false,
				selectedFile: null,
				uploadStatus: "idle",
				uploadError: null,
				arweaveStatus: "idle",
			};
		case "OPEN_REVIEW":
			return { ...state, reviewOpen: true };
		case "CLOSE_REVIEW":
			return { ...state, reviewOpen: false };
		case "SET_MAGIC_LINK_STATUS":
			return { ...state, magicLinkStatus: action.status };
		case "SET_DOC_MODE":
			return { ...state, docMode: action.mode };
		case "FILE_SELECTED":
			return { ...state, selectedFile: action.file, uploadStatus: "idle", fileHash: null };
		case "SET_ENCRYPT_ENABLED":
			return { ...state, encryptEnabled: action.enabled };
		case "SET_PASSPHRASE":
			return { ...state, passphrase: action.value };
		case "UPLOAD_START":
			return { ...state, uploadStatus: "working", uploadError: null };
		case "UPLOAD_SUCCESS":
			return {
				...state,
				uploadStatus: "done",
				fileHash: action.hash,
				form: { ...state.form, contractURI: action.uri },
			};
		case "UPLOAD_ERROR":
			return { ...state, uploadStatus: "error", uploadError: action.error };
		case "ARWEAVE_WALLET_SET":
			return { ...state, arweaveWallet: action.wallet };
		case "ARWEAVE_BALANCE_LOADED":
			return { ...state, arweaveBalance: action.balance };
		case "ARWEAVE_UPLOAD_START":
			return { ...state, arweaveStatus: "working" };
		case "ARWEAVE_UPLOAD_SUCCESS":
			return { ...state, arweaveStatus: "done", arweaveUri: action.uri };
		case "ARWEAVE_UPLOAD_ERROR":
			return { ...state, arweaveStatus: "error" };
		case "MARK_TOUCHED":
			return { ...state, touched: { ...state.touched, [action.key]: true } };
		case "SET_SUBMIT_ATTEMPTED":
			return { ...state, submitAttempted: true };
	}
}
