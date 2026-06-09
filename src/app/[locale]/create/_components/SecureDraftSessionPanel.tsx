"use client";

import { useMemo, useState } from "react";
import type { CreateState, ContractTermsFormat } from "../_lib/types";
import {
	buildDraftShareUrl,
	decryptSharedDraft,
	encryptDraftForShare,
	generateSessionKey,
	generateRoomId,
	getDraftRoomFromUrl,
	getEncryptedDraftFromUrl,
	inspectAllowedWallets,
	type ShareableDraft,
	shareableDraftFromState,
} from "../_lib/secureDraftShare";
import { useEncryptedDraftCollaboration } from "../_lib/useEncryptedDraftCollaboration";

interface SecureDraftSessionPanelProps {
	readonly state: CreateState;
	readonly connectedWallet: `0x${string}` | undefined;
	readonly onTermsBodyChange: (value: string) => void;
	readonly onTermsFormatChange: (format: ContractTermsFormat) => void;
	readonly onImportDraft: (draft: ShareableDraft) => void;
}

function normalizeWallet(value: string | undefined): string | undefined {
	const trimmed = value?.trim().toLowerCase();
	return trimmed !== undefined && /^0x[0-9a-f]{40}$/.test(trimmed) ? trimmed : undefined;
}

function formatUpdatedAt(value: string | null, formatter: Intl.DateTimeFormat): string {
	if (value === null) return "Not saved yet";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Not saved yet" : formatter.format(date);
}

function snippetFor(format: ContractTermsFormat, action: "bold" | "italic" | "heading"): string {
	if (format === "html") {
		if (action === "bold") return "<strong>important term</strong>";
		if (action === "italic") return "<em>clarifying note</em>";
		return "<h2>Section heading</h2>";
	}
	if (format === "markdown") {
		if (action === "bold") return "**important term**";
		if (action === "italic") return "_clarifying note_";
		return "## Section heading";
	}
	if (action === "bold") return "IMPORTANT TERM";
	if (action === "italic") return "clarifying note";
	return "Section heading";
}

export function SecureDraftSessionPanel({
	state,
	connectedWallet,
	onTermsBodyChange,
	onTermsFormatChange,
	onImportDraft,
}: SecureDraftSessionPanelProps): React.JSX.Element {
	const [shareUrl, setShareUrl] = useState("");
	const [sessionKey, setSessionKey] = useState("");
	const [importKey, setImportKey] = useState("");
	const [roomId, setRoomId] = useState<string | null>(() => getDraftRoomFromUrl());
	const [isSharing, setIsSharing] = useState(false);
	const [isStartingLiveRoom, setIsStartingLiveRoom] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const encryptedDraftFromUrl = getEncryptedDraftFromUrl();
	const updatedAtFormatter = useMemo(
		() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }),
		[],
	);
	const connected = normalizeWallet(connectedWallet);
	const counterparty = normalizeWallet(state.form.client);
	const allowedWallets = useMemo(
		() => [connected, counterparty].filter((wallet): wallet is string => wallet !== undefined),
		[connected, counterparty],
	);
	const urlAllowedWallets = useMemo(
		() => (encryptedDraftFromUrl === null ? [] : inspectAllowedWallets(encryptedDraftFromUrl)),
		[encryptedDraftFromUrl],
	);
	const collaboration = useEncryptedDraftCollaboration({
		state,
		roomId,
		sessionKey,
		connectedWallet,
		allowedWallets,
		onRemoteDraft: onImportDraft,
	});

	function insertSnippet(action: "bold" | "italic" | "heading"): void {
		const snippet = snippetFor(state.termsFormat, action);
		const separator = state.termsBody.endsWith("\n") || state.termsBody === "" ? "" : "\n";
		onTermsBodyChange(`${state.termsBody}${separator}${snippet}`);
	}

	async function handleCreateShare(): Promise<void> {
		if (isSharing) return;
		if (allowedWallets.length === 0) {
			setStatus("Connect your wallet or enter the counterparty wallet before sharing.");
			return;
		}
		setIsSharing(true);
		setStatus("Creating encrypted session link...");
		try {
			const key = generateSessionKey();
			const encryptedDraft = await encryptDraftForShare({
				draft: shareableDraftFromState(state),
				sessionKey: key,
				allowedWallets,
			});
			setRoomId(null);
			setShareUrl(buildDraftShareUrl(encryptedDraft));
			setSessionKey(key);
			setStatus("Encrypted share link created. Send the key separately.");
		} catch {
			setStatus("Unable to create the encrypted session link in this browser.");
		} finally {
			setIsSharing(false);
		}
	}

	async function handleStartLiveRoom(): Promise<void> {
		if (isStartingLiveRoom) return;
		if (allowedWallets.length === 0) {
			setStatus(
				"Connect your wallet or enter the counterparty wallet before starting live sync.",
			);
			return;
		}
		setIsStartingLiveRoom(true);
		setStatus("Starting encrypted live room...");
		try {
			const key = generateSessionKey();
			const nextRoomId = generateRoomId();
			const encryptedDraft = await encryptDraftForShare({
				draft: shareableDraftFromState(state),
				sessionKey: key,
				allowedWallets,
			});
			setRoomId(nextRoomId);
			setShareUrl(buildDraftShareUrl(encryptedDraft, nextRoomId));
			setSessionKey(key);
			setStatus("Encrypted live room started. Send the key separately.");
		} catch {
			setStatus("Unable to start the encrypted live room in this browser.");
		} finally {
			setIsStartingLiveRoom(false);
		}
	}

	async function handleImport(): Promise<void> {
		if (isImporting) return;
		if (encryptedDraftFromUrl === null) {
			setStatus("No encrypted draft was found in this URL.");
			return;
		}
		if (importKey.trim() === "") {
			setStatus("Paste the separate session key before importing.");
			return;
		}
		setIsImporting(true);
		setStatus("Decrypting draft...");
		try {
			const draft = await decryptSharedDraft({
				encryptedDraft: encryptedDraftFromUrl,
				sessionKey: importKey.trim(),
				walletAddress: connectedWallet,
			});
			setSessionKey(importKey.trim());
			setRoomId(getDraftRoomFromUrl());
			onImportDraft(draft);
			setStatus("Draft imported. Live updates are enabled while this page stays open.");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Unable to import draft.");
		} finally {
			setIsImporting(false);
		}
	}

	async function copyToClipboard(value: string, label: string): Promise<void> {
		if (value === "") return;
		try {
			await navigator.clipboard.writeText(value);
			setStatus(`${label} copied.`);
		} catch {
			setStatus(`Unable to copy the ${label.toLowerCase()} automatically.`);
		}
	}

	return (
		<section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
						Secure draft session
					</p>
					<h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
						Collaborative contract terms
					</h2>
					<p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						Write terms in Markdown, HTML, or plain text before deployment. Shared
						drafts are encrypted in the browser and require an allowed wallet plus a
						separate session key to decrypt. Start a live room only when both parties
						want ongoing co-editing.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<p className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300">
						Last updated:{" "}
						{formatUpdatedAt(state.termsLastUpdatedAt, updatedAtFormatter)}
					</p>
					<p className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300">
						{collaboration.isLive
							? collaboration.isPublishing
								? "Syncing live..."
								: "Live sync on"
							: "Live sync off"}
					</p>
				</div>
			</div>

			<div className="mt-5 flex flex-wrap gap-2">
				{(["markdown", "html", "plain"] as const).map((format) => (
					<button
						key={format}
						type="button"
						onClick={() => {
							onTermsFormatChange(format);
						}}
						className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
							state.termsFormat === format
								? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200"
								: "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
						}`}
					>
						{format}
					</button>
				))}
				<button
					type="button"
					aria-label="Insert bold terms snippet"
					onClick={() => {
						insertSnippet("bold");
					}}
					className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
				>
					B
				</button>
				<button
					type="button"
					aria-label="Insert italic terms snippet"
					onClick={() => {
						insertSnippet("italic");
					}}
					className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold italic text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
				>
					I
				</button>
				<button
					type="button"
					aria-label="Insert section heading terms snippet"
					onClick={() => {
						insertSnippet("heading");
					}}
					className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
				>
					H2
				</button>
			</div>

			<textarea
				value={state.termsBody}
				onChange={(event) => {
					onTermsBodyChange(event.target.value);
				}}
				rows={9}
				spellCheck
				className="mt-4 min-h-56 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-white"
				placeholder="Write the contract terms before deployment."
			/>

			<div className="mt-5 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
				<div className="grid gap-2 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
					<p>Allowed wallet: {connected ?? "connect your wallet"}</p>
					<p>Counterparty wallet: {counterparty ?? "enter a valid wallet above"}</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<button
						type="button"
						onClick={() => {
							void handleCreateShare();
						}}
						disabled={isSharing}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
					>
						{isSharing ? "Creating encrypted link..." : "Create encrypted share link"}
					</button>
					<button
						type="button"
						onClick={() => {
							void handleStartLiveRoom();
						}}
						disabled={isStartingLiveRoom}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300 hover:text-indigo-900 disabled:opacity-50 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:border-indigo-300/50"
					>
						{isStartingLiveRoom ? "Starting live room..." : "Start live room"}
					</button>
					<button
						type="button"
						onClick={() => {
							void copyToClipboard(shareUrl, "Link");
						}}
						disabled={shareUrl === ""}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-gray-200"
					>
						Copy link
					</button>
					<button
						type="button"
						onClick={() => {
							void copyToClipboard(sessionKey, "Session key");
						}}
						disabled={sessionKey === ""}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-gray-200"
					>
						Copy session key
					</button>
				</div>
				{shareUrl !== "" && (
					<p className="break-all rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300">
						{shareUrl}
					</p>
				)}
				{collaboration.isLive && (
					<p className="text-xs text-gray-600 dark:text-gray-300">
						Live room {roomId}: edits are encrypted before leaving the browser. Last
						remote update:{" "}
						{formatUpdatedAt(collaboration.lastRemoteUpdateAt, updatedAtFormatter)}.
					</p>
				)}
				{collaboration.lastError !== null && (
					<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
						{collaboration.lastError}
					</p>
				)}
				{encryptedDraftFromUrl !== null && (
					<div className="grid gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
						<p className="text-xs text-gray-600 dark:text-gray-300">
							This URL contains an encrypted draft for{" "}
							{urlAllowedWallets.length > 0
								? urlAllowedWallets.join(", ")
								: "allowed wallets"}
							. Connect the matching wallet, paste the separate key, then import.
						</p>
						<div className="flex flex-col gap-2 sm:flex-row">
							<input
								value={importKey}
								onChange={(event) => {
									setImportKey(event.target.value);
								}}
								placeholder="Paste session key"
								className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
							/>
							<button
								type="button"
								onClick={() => {
									void handleImport();
								}}
								disabled={isImporting}
								className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950"
							>
								{isImporting ? "Importing draft..." : "Import draft"}
							</button>
						</div>
					</div>
				)}
				{status !== null && (
					<p
						aria-live="polite"
						className="text-xs font-medium text-gray-600 dark:text-gray-300"
					>
						{status}
					</p>
				)}
			</div>
		</section>
	);
}
