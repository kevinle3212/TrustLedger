"use client";

import { useEffect, useReducer } from "react";
import { useTranslations } from "next-intl";
import { validateRequired } from "@/lib/validation";
import { decryptFile } from "@/lib/encryption";

type DecryptMode = "fetch" | "paste";
type DecryptStatus = "idle" | "working" | "done" | "error";
/** How the decrypted bytes can be rendered inline in the browser. */
type PreviewKind = "pdf" | "image" | "other";

/**
 * Sniff a small set of magic-byte signatures so the decrypted document can be
 * previewed inline without trusting any server-supplied MIME type. Anything not
 * recognized falls back to download-only, so an unknown blob is never embedded
 * with a guessed content type.
 */
function sniffKind(bytes: Uint8Array): PreviewKind {
	if (
		bytes.length >= 4 &&
		bytes[0] === 0x25 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x44 &&
		bytes[3] === 0x46
	)
		return "pdf"; // "%PDF"
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47
	)
		return "image"; // PNG
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
		return "image"; // JPEG
	if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
		return "image"; // GIF
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	)
		return "image"; // WEBP (RIFF....WEBP)
	return "other";
}

interface State {
	mode: DecryptMode;
	pastedBundle: string;
	passphrase: string;
	filename: string;
	status: DecryptStatus;
	errorMsg: string | null;
	passphraseTouched: boolean;
	bundleTouched: boolean;
	viewUrl: string | null;
	viewKind: PreviewKind | null;
}

type Action =
	| { type: "SET_MODE"; mode: DecryptMode }
	| { type: "SET_PASTED_BUNDLE"; value: string }
	| { type: "SET_PASSPHRASE"; value: string }
	| { type: "SET_FILENAME"; value: string }
	| { type: "DECRYPT_START" }
	| { type: "DECRYPT_SUCCESS" }
	| { type: "VIEW_SUCCESS"; url: string; kind: PreviewKind }
	| { type: "CLEAR_VIEW" }
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
	viewUrl: null,
	viewKind: null,
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
		case "VIEW_SUCCESS":
			return { ...state, status: "done", viewUrl: action.url, viewKind: action.kind };
		case "CLEAR_VIEW":
			return { ...state, viewUrl: null, viewKind: null, status: "idle" };
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

/**
 * Inline preview panel for a decrypted document. Renders the PDF in a sandboxed
 * iframe, images in an `<img>`, and anything else as a download-only notice.
 * Extracted from {@link DecryptDocumentForm} to keep the parent form small.
 */
function DecryptedDocumentPreview({
	viewUrl,
	viewKind,
	onClose,
	t,
}: {
	viewUrl: string;
	viewKind: PreviewKind;
	onClose: () => void;
	t: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-xs font-medium text-gray-700 dark:text-gray-200">
					{t("viewing")}
				</span>
				<div className="flex items-center gap-3 text-xs">
					<a
						href={viewUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="underline text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
					>
						{t("openInNewTab")}
					</a>
					<button
						type="button"
						onClick={onClose}
						className="underline text-gray-500 hover:text-gray-900 dark:hover:text-white"
					>
						{t("closeViewer")}
					</button>
				</div>
			</div>
			{viewKind === "pdf" ? (
				<iframe
					title={t("viewing")}
					src={viewUrl}
					// Constrain the embedded document: allow the browser's native PDF
					// viewer (same-origin blob) but withhold script/form/popup/top-nav
					// so a malicious PDF cannot execute or navigate away.
					sandbox="allow-same-origin"
					className="h-[70vh] w-full rounded-lg border border-gray-200 bg-white dark:border-white/10"
				/>
			) : viewKind === "image" ? (
				// eslint-disable-next-line @next/next/no-img-element -- local blob URL of a user-decrypted document, not a remote asset for next/image
				<img
					src={viewUrl}
					alt={t("viewing")}
					className="max-h-[70vh] w-auto self-start rounded-lg border border-gray-200 dark:border-white/10"
				/>
			) : (
				<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
					{t("cannotPreview")}
				</p>
			)}
		</div>
	);
}

/// Full-width decrypt panel for AES-256-GCM encrypted IPFS documents.
/// Rendered by ContractCard below the info grid when the user toggles decrypt open.
/// Supports fetching the bundle from a gateway URL or accepting a pasted JSON bundle.
/** Form for decrypting an encrypted contract document using the user's connected wallet private key. */
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
		viewUrl,
		viewKind,
	} = state;

	const passphraseError = validateRequired(passphrase, "Passphrase");
	const bundleError =
		mode === "paste" ? validateRequired(pastedBundle, "Encrypted bundle") : undefined;

	// Revoke the in-app preview object URL when it changes or the form unmounts,
	// so decrypted document bytes never linger in memory longer than needed.
	useEffect(() => {
		if (viewUrl === null) return;
		return (): void => {
			URL.revokeObjectURL(viewUrl);
		};
	}, [viewUrl]);

	// Shared: fetch/parse the bundle and decrypt it to raw bytes. Both the
	// download and the in-app view paths reuse this so decryption stays in one place.
	async function decryptToBytes(): Promise<ArrayBuffer> {
		let buffer: ArrayBuffer;
		if (mode === "fetch") {
			const res = await fetch(gatewayUrl);
			if (!res.ok)
				throw new Error(`Gateway returned ${String(res.status)} ${res.statusText}`);
			buffer = await res.arrayBuffer();
		} else {
			buffer = new TextEncoder().encode(pastedBundle.trim()).buffer;
		}
		return await decryptFile(buffer, passphrase);
	}

	function toFriendlyError(err: unknown): string {
		// AES-GCM throws OperationError when the passphrase is wrong or ciphertext is tampered.
		return err instanceof DOMException && err.name === "OperationError"
			? t("decryptionFailed")
			: err instanceof Error
				? err.message
				: String(err);
	}

	async function handleDecrypt(): Promise<void> {
		dispatch({ type: "DECRYPT_START" });
		try {
			const decrypted = await decryptToBytes();
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
			dispatch({ type: "DECRYPT_ERROR", errorMsg: toFriendlyError(err) });
		}
	}

	async function handleView(): Promise<void> {
		dispatch({ type: "DECRYPT_START" });
		try {
			const decrypted = await decryptToBytes();
			const kind = sniffKind(new Uint8Array(decrypted));
			// Only PDFs get an explicit content type (needed for the embedded viewer);
			// images render from a typeless blob, and unknown files preview as download-only.
			const blob =
				kind === "pdf"
					? new Blob([decrypted], { type: "application/pdf" })
					: new Blob([decrypted]);
			const url = URL.createObjectURL(blob);
			dispatch({ type: "VIEW_SUCCESS", url, kind });
		} catch (err) {
			dispatch({ type: "DECRYPT_ERROR", errorMsg: toFriendlyError(err) });
		}
	}

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
			<div className="flex items-center justify-between gap-3">
				<span className="text-xs font-medium text-gray-700 dark:text-gray-200">
					{t("title")}
				</span>
				<button
					type="button"
					onClick={onClose}
					className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-xs text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-gray-200"
				>
					✕
				</button>
			</div>

			{/* Source mode toggle: "fetch" loads from the IPFS gateway URI; "paste" accepts a copied JSON bundle */}
			<div className="flex flex-wrap gap-1 self-start rounded-lg bg-gray-100 p-1 dark:bg-white/5">
				{(["fetch", "paste"] as DecryptMode[]).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => {
							dispatch({ type: "SET_MODE", mode: m });
						}}
						className={`min-h-9 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
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
						aria-label={t("encryptedBundleJson")}
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
					aria-label={t("passphraseAria")}
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
				aria-label={t("outputFilenameAria")}
				type="text"
				placeholder={t("outputFilenamePlaceholder")}
				value={filename}
				onChange={(e) => {
					dispatch({ type: "SET_FILENAME", value: e.target.value });
				}}
				className="rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
			/>

			{viewUrl !== null ? (
				<DecryptedDocumentPreview
					viewUrl={viewUrl}
					viewKind={viewKind ?? "other"}
					onClose={() => {
						dispatch({ type: "CLEAR_VIEW" });
					}}
					t={t}
				/>
			) : status === "done" ? (
				<p className="text-xs text-green-700 dark:text-green-400">
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
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => {
							void handleView();
						}}
						disabled={
							status === "working" ||
							passphrase === "" ||
							(mode === "paste" && pastedBundle.trim() === "")
						}
						className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
					>
						{status === "working" ? t("decrypting") : t("decryptAndView")}
					</button>
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
						className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors dark:border-white/10 dark:text-gray-200 dark:hover:text-white"
					>
						{t("decryptAndDownload")}
					</button>
				</div>
			)}

			{status === "error" && errorMsg !== null && (
				<p className="text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
					{errorMsg}
				</p>
			)}
		</div>
	);
}
