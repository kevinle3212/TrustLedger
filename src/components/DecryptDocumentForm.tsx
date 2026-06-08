"use client";

import { useReducer } from "react";
import { useTranslations } from "next-intl";
import { validateRequired } from "@/lib/validation";
import { decryptFile } from "@/lib/encryption";

type DecryptMode = "fetch" | "paste";
type DecryptStatus = "idle" | "working" | "done" | "error";

interface State {
	mode: DecryptMode;
	pastedBundle: string;
	passphrase: string;
	filename: string;
	status: DecryptStatus;
	errorMsg: string | null;
	passphraseTouched: boolean;
	bundleTouched: boolean;
}

type Action =
	| { type: "SET_MODE"; mode: DecryptMode }
	| { type: "SET_PASTED_BUNDLE"; value: string }
	| { type: "SET_PASSPHRASE"; value: string }
	| { type: "SET_FILENAME"; value: string }
	| { type: "DECRYPT_START" }
	| { type: "DECRYPT_SUCCESS" }
	| { type: "DECRYPT_ERROR"; errorMsg: string }
	| { type: "TOUCH_PASSPHRASE" }
	| { type: "TOUCH_BUNDLE" }
	| { type: "RESET_AFTER_DECRYPT" };

const initialState: State = {
	mode: "fetch",
	pastedBundle: "",
	passphrase: "",
	filename: "decrypted-document",
	status: "idle",
	errorMsg: null,
	passphraseTouched: false,
	bundleTouched: false,
};

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "SET_MODE":
			return { ...state, mode: action.mode };
		case "SET_PASTED_BUNDLE":
			return { ...state, pastedBundle: action.value };
		case "SET_PASSPHRASE":
			return { ...state, passphrase: action.value };
		case "SET_FILENAME":
			return { ...state, filename: action.value };
		case "DECRYPT_START":
			return { ...state, status: "working", errorMsg: null };
		case "DECRYPT_SUCCESS":
			return { ...state, status: "done" };
		case "DECRYPT_ERROR":
			return { ...state, status: "error", errorMsg: action.errorMsg };
		case "TOUCH_PASSPHRASE":
			return { ...state, passphraseTouched: true };
		case "TOUCH_BUNDLE":
			return { ...state, bundleTouched: true };
		case "RESET_AFTER_DECRYPT":
			return { ...state, status: "idle", errorMsg: null, passphrase: "" };
	}
}

/// Full-width decrypt panel for AES-256-GCM encrypted IPFS documents.
/// Rendered by ContractCard below the info grid when the user toggles decrypt open.
/// Supports fetching the bundle from a gateway URL or accepting a pasted JSON bundle.
export function DecryptDocumentForm({
	gatewayUrl,
	onClose,
}: {
	gatewayUrl: string;
	onClose: () => void;
}): React.JSX.Element {
	const t = useTranslations("Decrypt");
	const [state, dispatch] = useReducer(reducer, initialState);
	const {
		mode,
		pastedBundle,
		passphrase,
		filename,
		status,
		errorMsg,
		passphraseTouched,
		bundleTouched,
	} = state;

	const passphraseError = validateRequired(passphrase, "Passphrase");
	const bundleError =
		mode === "paste" ? validateRequired(pastedBundle, "Encrypted bundle") : undefined;

	async function handleDecrypt(): Promise<void> {
		dispatch({ type: "DECRYPT_START" });
		try {
			let buffer: ArrayBuffer;
			if (mode === "fetch") {
				const res = await fetch(gatewayUrl);
				if (!res.ok)
					throw new Error(`Gateway returned ${String(res.status)} ${res.statusText}`);
				buffer = await res.arrayBuffer();
			} else {
				buffer = new TextEncoder().encode(pastedBundle.trim()).buffer;
			}
			const decrypted = await decryptFile(buffer, passphrase);
			// Trigger a browser download by creating a temporary <a> element, clicking it,
			// and immediately revoking the object URL to free memory.
			const url = URL.createObjectURL(new Blob([decrypted]));
			const a = document.createElement("a");
			a.href = url;
			a.download = filename.trim() !== "" ? filename.trim() : "decrypted-document";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			dispatch({ type: "DECRYPT_SUCCESS" });
		} catch (err) {
			// AES-GCM throws OperationError when the passphrase is wrong or ciphertext is tampered.
			const friendly =
				err instanceof DOMException && err.name === "OperationError"
					? t("decryptionFailed")
					: err instanceof Error
						? err.message
						: String(err);
			dispatch({ type: "DECRYPT_ERROR", errorMsg: friendly });
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-gray-700 dark:text-gray-200">
					{t("title")}
				</span>
				<button
					type="button"
					onClick={onClose}
					className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
				>
					✕
				</button>
			</div>

			{/* Source mode toggle: "fetch" loads from the IPFS gateway URI; "paste" accepts a copied JSON bundle */}
			<div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-white/5 p-1 self-start">
				{(["fetch", "paste"] as DecryptMode[]).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => {
							dispatch({ type: "SET_MODE", mode: m });
						}}
						className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
							mode === m
								? "bg-indigo-600 text-white"
								: "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
						}`}
					>
						{m === "fetch" ? t("fetchFromUri") : t("pasteBundle")}
					</button>
				))}
			</div>

			{mode === "fetch" ? (
				<p className="text-xs text-gray-500 break-all">
					{t("willFetch", { url: "" })}
					<span className="font-mono text-gray-600 dark:text-gray-400">{gatewayUrl}</span>
				</p>
			) : (
				<div className="flex flex-col gap-1">
					<textarea
						aria-label="Encrypted bundle JSON"
						rows={4}
						placeholder={'{"v":1,"alg":"AES-256-GCM",…}'}
						value={pastedBundle}
						onChange={(e) => {
							dispatch({ type: "SET_PASTED_BUNDLE", value: e.target.value });
						}}
						onBlur={() => {
							dispatch({ type: "TOUCH_BUNDLE" });
						}}
						aria-invalid={bundleTouched && bundleError !== undefined}
						className={`rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 font-mono focus:outline-none focus:ring-2 resize-none ${
							bundleTouched && bundleError !== undefined
								? "border-red-500 dark:border-red-500 focus:ring-red-500"
								: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
						}`}
					/>
					{bundleTouched && bundleError !== undefined && (
						<p className="text-xs text-red-500 dark:text-red-400">{bundleError}</p>
					)}
				</div>
			)}

			<div className="flex flex-col gap-1">
				<input
					aria-label="Passphrase for decryption"
					type="password"
					placeholder={t("passphrasePlaceholder")}
					value={passphrase}
					onChange={(e) => {
						dispatch({ type: "SET_PASSPHRASE", value: e.target.value });
					}}
					onBlur={() => {
						dispatch({ type: "TOUCH_PASSPHRASE" });
					}}
					aria-invalid={passphraseTouched && passphraseError !== undefined}
					className={`rounded-lg bg-gray-50 dark:bg-white/5 border px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 ${
						passphraseTouched && passphraseError !== undefined
							? "border-red-500 dark:border-red-500 focus:ring-red-500"
							: "border-gray-200 dark:border-white/10 focus:ring-indigo-500"
					}`}
				/>
				{passphraseTouched && passphraseError !== undefined && (
					<p className="text-xs text-red-500 dark:text-red-400">{passphraseError}</p>
				)}
			</div>

			<input
				aria-label="Output filename"
				type="text"
				placeholder={t("outputFilenamePlaceholder")}
				value={filename}
				onChange={(e) => {
					dispatch({ type: "SET_FILENAME", value: e.target.value });
				}}
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
			/>

			{status === "done" ? (
				<p className="text-xs text-green-500 dark:text-green-400">
					{t("fileDownloaded")}{" "}
					<button
						type="button"
						onClick={() => {
							dispatch({ type: "RESET_AFTER_DECRYPT" });
						}}
						className="underline text-gray-500 hover:text-gray-900 dark:hover:text-white"
					>
						{t("decryptAnother")}
					</button>
				</p>
			) : (
				<button
					type="button"
					onClick={() => {
						void handleDecrypt();
					}}
					disabled={
						status === "working" ||
						passphrase === "" ||
						(mode === "paste" && pastedBundle.trim() === "")
					}
					className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
				>
					{status === "working" ? t("decrypting") : t("decryptAndDownload")}
				</button>
			)}

			{status === "error" && errorMsg !== null && (
				<p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
					{errorMsg}
				</p>
			)}
		</div>
	);
}
