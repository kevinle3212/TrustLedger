"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CreateState, ContractTermsFormat } from "../_lib/types";
import { convertContractTerms, DEFAULT_CONTRACT_TERMS } from "../_lib/contractTerms";
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

interface PanelStatus {
	readonly tone: "success" | "error" | "info";
	readonly text: string;
}

interface PanelState {
	readonly shareUrl: string;
	readonly sessionKey: string;
	readonly importKey: string;
	readonly roomId: string | null;
	readonly isSharing: boolean;
	readonly isStartingLiveRoom: boolean;
	readonly isImporting: boolean;
	readonly cooldownUntil: number;
	readonly generationCount: number;
	readonly status: PanelStatus | null;
}

type PanelAction =
	| { readonly type: "SET_SHARE"; readonly shareUrl: string; readonly sessionKey: string }
	| {
			readonly type: "SET_LIVE_ROOM";
			readonly roomId: string;
			readonly shareUrl: string;
			readonly sessionKey: string;
	  }
	| { readonly type: "SET_IMPORT_KEY"; readonly importKey: string }
	| { readonly type: "SET_SESSION_KEY"; readonly sessionKey: string }
	| { readonly type: "SET_ROOM_ID"; readonly roomId: string | null }
	| { readonly type: "SET_SHARING"; readonly isSharing: boolean }
	| { readonly type: "SET_STARTING_LIVE_ROOM"; readonly isStartingLiveRoom: boolean }
	| { readonly type: "SET_IMPORTING"; readonly isImporting: boolean }
	| { readonly type: "SET_COOLDOWN"; readonly cooldownUntil: number }
	| { readonly type: "SET_STATUS"; readonly status: PanelStatus | null };

const SHARE_ACTION_COOLDOWN_MS = 10_000;

function panelReducer(state: PanelState, action: PanelAction): PanelState {
	switch (action.type) {
		case "SET_SHARE":
			return {
				...state,
				roomId: null,
				shareUrl: action.shareUrl,
				sessionKey: action.sessionKey,
				generationCount: state.generationCount + 1,
			};
		case "SET_LIVE_ROOM":
			return {
				...state,
				roomId: action.roomId,
				shareUrl: action.shareUrl,
				sessionKey: action.sessionKey,
				generationCount: state.generationCount + 1,
			};
		case "SET_IMPORT_KEY":
			return { ...state, importKey: action.importKey };
		case "SET_SESSION_KEY":
			return { ...state, sessionKey: action.sessionKey };
		case "SET_ROOM_ID":
			return { ...state, roomId: action.roomId };
		case "SET_SHARING":
			return { ...state, isSharing: action.isSharing };
		case "SET_STARTING_LIVE_ROOM":
			return { ...state, isStartingLiveRoom: action.isStartingLiveRoom };
		case "SET_IMPORTING":
			return { ...state, isImporting: action.isImporting };
		case "SET_COOLDOWN":
			return { ...state, cooldownUntil: action.cooldownUntil };
		case "SET_STATUS":
			return { ...state, status: action.status };
	}
}

function normalizeWallet(value: string | undefined): string | undefined {
	const trimmed = value?.trim().toLowerCase();
	return trimmed !== undefined && /^0x[0-9a-f]{40}$/.test(trimmed) ? trimmed : undefined;
}

function formatUpdatedAt(
	value: string | null,
	formatter: Intl.DateTimeFormat,
	nowMs: number,
): string {
	if (value === null) return "Not saved yet";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Not saved yet";
	const diffMinutes = Math.max(0, Math.floor((nowMs - date.getTime()) / 60_000));
	const relative =
		diffMinutes === 0
			? "Updated Less Than 1 Minute Ago"
			: `Updated ${diffMinutes.toString()} ${diffMinutes === 1 ? "Minute" : "Minutes"} Ago`;
	return `${formatter.format(date)} (${relative})`;
}

type EditorSnippet =
	| "bold"
	| "italic"
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "paragraph"
	| "link"
	| "image"
	| "list"
	| "quote"
	| "code";

const MARKDOWN_SNIPPETS = [
	["bold", "Bold"],
	["italic", "Italics"],
	["h1", "H1"],
	["h2", "H2"],
	["h3", "H3"],
	["h4", "H4"],
	["link", "Link"],
	["image", "Image"],
	["list", "List"],
	["quote", "Quote"],
	["code", "Code"],
] as const satisfies readonly (readonly [EditorSnippet, string])[];

const HTML_SNIPPETS = [
	["paragraph", "<p>"],
	["bold", "<strong>"],
	["italic", "<em>"],
	["h1", "<h1>"],
	["h2", "<h2>"],
	["h3", "<h3>"],
	["h4", "<h4>"],
	["link", "<a>"],
	["image", "<img>"],
	["list", "<ul>"],
	["quote", "<blockquote>"],
] as const satisfies readonly (readonly [EditorSnippet, string])[];

function snippetFor(format: ContractTermsFormat, action: EditorSnippet): string {
	if (format === "html") {
		const htmlSnippets = {
			bold: "<strong>Important Term</strong>",
			italic: "<em>Clarifying Note</em>",
			h1: "<h1>Primary Heading</h1>",
			h2: "<h2>Section Heading</h2>",
			h3: "<h3>Subsection Heading</h3>",
			h4: "<h4>Detail Heading</h4>",
			paragraph: "<p>Contract paragraph goes here.</p>",
			link: '<a href="https://example.com">Reference Link</a>',
			image: '<img src="https://example.com/image.png" alt="Contract Attachment" />',
			list: "<ul>\n  <li>Contract Obligation</li>\n</ul>",
			quote: "<blockquote>Quoted contract language.</blockquote>",
			code: "<code>Defined Term</code>",
		} satisfies Record<EditorSnippet, string>;
		return htmlSnippets[action];
	}
	if (format === "markdown") {
		const markdownSnippets = {
			bold: "**Important Term**",
			italic: "_Clarifying Note_",
			h1: "# Primary Heading",
			h2: "## Section Heading",
			h3: "### Subsection Heading",
			h4: "#### Detail Heading",
			paragraph: "Contract paragraph goes here.",
			link: "[Reference Link](https://example.com)",
			image: "![Contract Attachment](https://example.com/image.png)",
			list: "- Contract Obligation",
			quote: "> Quoted contract language.",
			code: "`Defined Term`",
		} satisfies Record<EditorSnippet, string>;
		return markdownSnippets[action];
	}
	if (action === "bold") return "IMPORTANT TERM";
	if (action === "italic") return "Clarifying Note";
	if (action === "paragraph") return "Contract paragraph goes here.";
	return "Section Heading";
}

function formatLabel(format: ContractTermsFormat): string {
	if (format === "html") return "HTML";
	if (format === "plain") return "Plain Text";
	return "Markdown";
}

function cooldownSeconds(cooldownUntil: number, nowMs: number): number {
	return Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000));
}

function buildDraftEmailHref(input: {
	readonly to: string;
	readonly shareUrl: string;
	readonly sessionKey: string;
	readonly roomId: string | null;
}): string {
	const subject =
		input.roomId === null ? "TrustLedger Encrypted Draft Link" : "TrustLedger Live Draft Room";
	const body = [
		"Hello,",
		"",
		"I am sharing a TrustLedger encrypted contract draft with you.",
		"",
		`Share Link: ${input.shareUrl}`,
		`Session Key: ${input.sessionKey}`,
		input.roomId === null ? null : `Live Room ID: ${input.roomId}`,
		"",
		"Open the link, connect the allowed wallet, and use the session key to decrypt the draft.",
		"Please do not forward this email unless both parties agree.",
		"",
		"Thank you.",
	].filter((line): line is string => line !== null);
	return `mailto:${encodeURIComponent(input.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.join("\n"))}`;
}

function DraftTermsEditor({
	state,
	collaboration,
	updatedAtFormatter,
	nowMs,
	onTermsBodyChange,
	onTermsFormatChange,
	onInsertSnippet,
}: {
	readonly state: CreateState;
	readonly collaboration: ReturnType<typeof useEncryptedDraftCollaboration>;
	readonly updatedAtFormatter: Intl.DateTimeFormat;
	readonly nowMs: number;
	readonly onTermsBodyChange: (value: string) => void;
	readonly onTermsFormatChange: (format: ContractTermsFormat) => void;
	readonly onInsertSnippet: (action: EditorSnippet) => void;
}): React.JSX.Element {
	const visibleSnippets =
		state.termsFormat === "markdown"
			? MARKDOWN_SNIPPETS
			: state.termsFormat === "html"
				? HTML_SNIPPETS
				: [];

	return (
		<>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
						Secure Draft Session
					</p>
					<h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
						Collaborative Contract Terms
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
						Last Updated:{" "}
						{formatUpdatedAt(state.termsLastUpdatedAt, updatedAtFormatter, nowMs)}
					</p>
					<p
						className={`tl-live-sync-pill rounded-full border px-3 py-1 text-xs font-semibold ${
							collaboration.isLive
								? "tl-live-sync-pill--on border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
								: "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
						}`}
					>
						{collaboration.isLive
							? collaboration.isPublishing
								? "Syncing Live..."
								: "Live Sync On"
							: "Live Sync Off"}
					</p>
				</div>
			</div>

			<div className="mt-5 flex flex-wrap gap-2">
				{(["markdown", "html", "plain"] as const).map((format) => (
					<button
						key={format}
						type="button"
						onClick={() => {
							const converted = convertContractTerms(
								state.termsBody,
								state.termsFormat,
								format,
							);
							onTermsBodyChange(converted);
							onTermsFormatChange(format);
						}}
						className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
							state.termsFormat === format
								? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200"
								: "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-950 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-white/20 dark:hover:text-white"
						}`}
					>
						{formatLabel(format)}
					</button>
				))}
				<button
					type="button"
					onClick={() => {
						onTermsBodyChange(DEFAULT_CONTRACT_TERMS[state.termsFormat]);
					}}
					className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
				>
					Insert Default Template
				</button>
				{visibleSnippets.map(([action, label]) => (
					<button
						key={action}
						type="button"
						aria-label={`Insert ${label} terms snippet`}
						onClick={() => {
							onInsertSnippet(action);
						}}
						className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 ${
							action === "bold"
								? "font-bold"
								: action === "italic"
									? "font-semibold italic"
									: "font-semibold"
						}`}
					>
						{label}
					</button>
				))}
			</div>

			<textarea
				aria-label="Collaborative Contract Terms Editor"
				value={state.termsBody}
				onChange={(event) => {
					onTermsBodyChange(event.target.value);
				}}
				rows={9}
				spellCheck
				className="mt-4 min-h-56 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-white"
				placeholder="Write The Contract Terms Before Deployment."
			/>
		</>
	);
}

function DraftShareControls({
	panel,
	connected,
	counterparty,
	collaboration,
	encryptedDraftFromUrl,
	urlAllowedWallets,
	liveRoomLocked,
	updatedAtFormatter,
	nowMs,
	emailAddress,
	onCreateShare,
	onStartLiveRoom,
	onCopy,
	onImport,
	onImportKeyChange,
}: {
	readonly panel: PanelState;
	readonly connected: string | undefined;
	readonly counterparty: string | undefined;
	readonly collaboration: ReturnType<typeof useEncryptedDraftCollaboration>;
	readonly encryptedDraftFromUrl: string | null;
	readonly urlAllowedWallets: readonly string[];
	readonly liveRoomLocked: boolean;
	readonly updatedAtFormatter: Intl.DateTimeFormat;
	readonly nowMs: number;
	readonly emailAddress: string;
	readonly onCreateShare: () => void;
	readonly onStartLiveRoom: () => void;
	readonly onCopy: (value: string, label: string) => void;
	readonly onImport: () => void;
	readonly onImportKeyChange: (value: string) => void;
}): React.JSX.Element {
	const secondsRemaining = cooldownSeconds(panel.cooldownUntil, nowMs);
	const cooldownActive = secondsRemaining > 0;
	const emailHref =
		panel.shareUrl !== "" && panel.sessionKey !== ""
			? buildDraftEmailHref({
					to: emailAddress,
					shareUrl: panel.shareUrl,
					sessionKey: panel.sessionKey,
					roomId: panel.roomId,
				})
			: "";

	return (
		<div className="mt-5 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
			<div className="grid gap-3 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
				<div className="tl-wallet-chip rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-400/10">
					<p className="font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">
						Allowed Wallet
					</p>
					<p className="mt-1 break-all font-mono text-gray-800 dark:text-gray-100">
						{connected ?? "Connect Your Wallet"}
					</p>
				</div>
				<div className="tl-wallet-chip rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-400/20 dark:bg-indigo-400/10">
					<p className="font-semibold uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-200">
						Counterparty Wallet
					</p>
					<p className="mt-1 break-all font-mono text-gray-800 dark:text-gray-100">
						{counterparty ?? "Enter The Counterparty Wallet In Contract Details Below"}
					</p>
				</div>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row">
				<button
					type="button"
					onClick={onCreateShare}
					disabled={panel.isSharing || cooldownActive}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
				>
					{panel.isSharing
						? "Creating Encrypted Link..."
						: cooldownActive
							? `Create Link In ${secondsRemaining.toString()}s`
							: "Create Encrypted Share Link"}
				</button>
				<button
					type="button"
					onClick={onStartLiveRoom}
					disabled={panel.isStartingLiveRoom || liveRoomLocked || cooldownActive}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300 hover:text-indigo-900 disabled:opacity-50 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:border-indigo-300/50"
				>
					{panel.isStartingLiveRoom
						? "Starting Live Room..."
						: cooldownActive
							? `Start Live Room In ${secondsRemaining.toString()}s`
							: liveRoomLocked
								? "Live Room Started"
								: "Start Live Room"}
				</button>
				<button
					type="button"
					onClick={() => {
						onCopy(panel.shareUrl, "Link");
					}}
					disabled={panel.shareUrl === ""}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-gray-200"
				>
					Copy Link
				</button>
				<button
					type="button"
					onClick={() => {
						onCopy(panel.sessionKey, "Session Key");
					}}
					disabled={panel.sessionKey === ""}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-gray-200"
				>
					Copy Session Key
				</button>
				<a
					href={emailHref}
					aria-disabled={emailHref === ""}
					className={`tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-300 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100 ${
						emailHref === "" ? "pointer-events-none opacity-50" : ""
					}`}
				>
					Email Link And Key
				</a>
			</div>
			{panel.generationCount > 0 && (
				<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
					Creating another link replaces the active link and key shown here. Do not use
					older links or keys after generating a newer one; encrypted snapshot URLs that
					were already shared cannot be revoked without a backend revocation service.
				</p>
			)}
			{panel.shareUrl !== "" && (
				<div className="grid gap-2 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
					<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
						Share Link
					</p>
					<p className="break-all font-mono text-xs text-gray-600 dark:text-gray-300">
						{panel.shareUrl}
					</p>
				</div>
			)}
			{collaboration.isLive && (
				<p className="text-xs text-gray-600 dark:text-gray-300">
					Live Room {panel.roomId}: edits are encrypted before leaving the browser. Last
					Remote Update:{" "}
					{formatUpdatedAt(collaboration.lastRemoteUpdateAt, updatedAtFormatter, nowMs)}.
				</p>
			)}
			{collaboration.lastError !== null && (
				<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
					{collaboration.lastError.replace(
						"Unable to load the live draft room.",
						"Unable To Load The Live Draft Room. Check The Session Link, Session Key, Wallet, Or Room Expiration.",
					)}
				</p>
			)}
			{encryptedDraftFromUrl !== null && (
				<div className="grid gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
					<p className="text-xs text-gray-600 dark:text-gray-300">
						This URL Contains An Encrypted Draft For{" "}
						{urlAllowedWallets.length > 0
							? urlAllowedWallets.join(", ")
							: "Allowed Wallets"}
						. Connect The Matching Wallet, Paste The Separate Key, Then Import.
					</p>
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							aria-label="Session Key"
							value={panel.importKey}
							onChange={(event) => {
								onImportKeyChange(event.target.value);
							}}
							placeholder="Paste Session Key"
							className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
						<button
							type="button"
							onClick={onImport}
							disabled={panel.isImporting}
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950"
						>
							{panel.isImporting ? "Importing Draft..." : "Import Draft"}
						</button>
					</div>
				</div>
			)}
			{panel.status !== null && (
				<p
					aria-live="polite"
					className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
						panel.status.tone === "success"
							? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
							: panel.status.tone === "error"
								? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
								: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200"
					}`}
				>
					{panel.status.text}
				</p>
			)}
		</div>
	);
}

export function SecureDraftSessionPanel({
	state,
	connectedWallet,
	onTermsBodyChange,
	onTermsFormatChange,
	onImportDraft,
}: SecureDraftSessionPanelProps): React.JSX.Element {
	const [panel, dispatchPanel] = useReducer(
		panelReducer,
		undefined,
		(): PanelState => ({
			shareUrl: "",
			sessionKey: "",
			importKey: "",
			roomId: getDraftRoomFromUrl(),
			isSharing: false,
			isStartingLiveRoom: false,
			isImporting: false,
			cooldownUntil: 0,
			generationCount: 0,
			status: null,
		}),
	);
	const lastRoomStartAt = useRef(0);
	const [nowMs, setNowMs] = useState(() => Date.now());
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
		roomId: panel.roomId,
		sessionKey: panel.sessionKey,
		connectedWallet,
		allowedWallets,
		onRemoteDraft: onImportDraft,
	});
	const liveRoomLocked = panel.roomId !== null || collaboration.isLive;

	useEffect(() => {
		const timer = window.setInterval(() => {
			setNowMs(Date.now());
		}, 1000);
		return (): void => {
			window.clearInterval(timer);
		};
	}, []);

	function insertSnippet(action: EditorSnippet): void {
		const snippet = snippetFor(state.termsFormat, action);
		const separator = state.termsBody.endsWith("\n") || state.termsBody === "" ? "" : "\n";
		onTermsBodyChange(`${state.termsBody}${separator}${snippet}`);
	}

	function updateStatus(tone: "success" | "error" | "info", text: string): void {
		dispatchPanel({ type: "SET_STATUS", status: { tone, text } });
	}

	async function copyValue(value: string, label: string): Promise<boolean> {
		if (value === "") return false;
		try {
			await navigator.clipboard.writeText(value);
			updateStatus("success", `${label} Copied!`);
			return true;
		} catch {
			updateStatus(
				"error",
				`Unable To Copy ${label}. Copy It Manually From The Share Link Field Below.`,
			);
			return false;
		}
	}

	async function handleCreateShare(): Promise<void> {
		if (panel.isSharing) return;
		if (nowMs < panel.cooldownUntil) return;
		if (allowedWallets.length === 0) {
			updateStatus(
				"error",
				"Connect Your Wallet Or Enter The Counterparty Wallet Before Sharing.",
			);
			return;
		}
		dispatchPanel({ type: "SET_SHARING", isSharing: true });
		updateStatus("info", "Creating Encrypted Session Link...");
		try {
			const key = generateSessionKey();
			const encryptedDraft = await encryptDraftForShare({
				draft: shareableDraftFromState(state),
				sessionKey: key,
				allowedWallets,
			});
			dispatchPanel({
				type: "SET_SHARE",
				shareUrl: buildDraftShareUrl(encryptedDraft),
				sessionKey: key,
			});
			dispatchPanel({
				type: "SET_COOLDOWN",
				cooldownUntil: Date.now() + SHARE_ACTION_COOLDOWN_MS,
			});
			updateStatus(
				"success",
				"Encrypted Share Link Created. Send The Session Key Separately.",
			);
		} catch {
			updateStatus("error", "Unable To Create The Encrypted Session Link In This Browser.");
		} finally {
			dispatchPanel({ type: "SET_SHARING", isSharing: false });
		}
	}

	async function handleStartLiveRoom(): Promise<void> {
		const now = Date.now();
		if (
			panel.isStartingLiveRoom ||
			liveRoomLocked ||
			now < panel.cooldownUntil ||
			now - lastRoomStartAt.current < 2_000
		) {
			return;
		}
		if (allowedWallets.length === 0) {
			updateStatus(
				"error",
				"Connect Your Wallet Or Enter The Counterparty Wallet Before Starting Live Sync.",
			);
			return;
		}
		lastRoomStartAt.current = now;
		dispatchPanel({ type: "SET_STARTING_LIVE_ROOM", isStartingLiveRoom: true });
		updateStatus("info", "Starting Encrypted Live Room...");
		try {
			const key = generateSessionKey();
			const nextRoomId = generateRoomId();
			const encryptedDraft = await encryptDraftForShare({
				draft: shareableDraftFromState(state),
				sessionKey: key,
				allowedWallets,
			});
			const nextShareUrl = buildDraftShareUrl(encryptedDraft, nextRoomId);
			dispatchPanel({
				type: "SET_LIVE_ROOM",
				roomId: nextRoomId,
				shareUrl: nextShareUrl,
				sessionKey: key,
			});
			dispatchPanel({
				type: "SET_COOLDOWN",
				cooldownUntil: Date.now() + SHARE_ACTION_COOLDOWN_MS,
			});
			await copyValue(nextShareUrl, "Live Room Link");
		} catch {
			updateStatus("error", "Unable To Start The Encrypted Live Room In This Browser.");
		} finally {
			dispatchPanel({ type: "SET_STARTING_LIVE_ROOM", isStartingLiveRoom: false });
		}
	}

	async function handleImport(): Promise<void> {
		if (panel.isImporting) return;
		if (encryptedDraftFromUrl === null) {
			updateStatus("error", "No Encrypted Draft Was Found In This URL.");
			return;
		}
		if (panel.importKey.trim() === "") {
			updateStatus("error", "Paste The Separate Session Key Before Importing.");
			return;
		}
		dispatchPanel({ type: "SET_IMPORTING", isImporting: true });
		updateStatus("info", "Decrypting Draft...");
		try {
			const draft = await decryptSharedDraft({
				encryptedDraft: encryptedDraftFromUrl,
				sessionKey: panel.importKey.trim(),
				walletAddress: connectedWallet,
			});
			dispatchPanel({ type: "SET_ROOM_ID", roomId: getDraftRoomFromUrl() });
			dispatchPanel({ type: "SET_SESSION_KEY", sessionKey: panel.importKey.trim() });
			onImportDraft(draft);
			updateStatus(
				"success",
				"Draft Imported. Live Updates Stay Enabled While This Page Is Open.",
			);
		} catch (error) {
			updateStatus(
				"error",
				error instanceof Error
					? error.message.replace(
							"Unable to load the live draft room.",
							"Unable To Load The Live Draft Room. Check The Session Link, Key, Wallet, Or Room Expiration.",
						)
					: "Unable To Import Draft.",
			);
		} finally {
			dispatchPanel({ type: "SET_IMPORTING", isImporting: false });
		}
	}

	return (
		<section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
			<DraftTermsEditor
				state={state}
				collaboration={collaboration}
				updatedAtFormatter={updatedAtFormatter}
				nowMs={nowMs}
				onTermsBodyChange={onTermsBodyChange}
				onTermsFormatChange={onTermsFormatChange}
				onInsertSnippet={insertSnippet}
			/>
			<DraftShareControls
				panel={panel}
				connected={connected}
				counterparty={counterparty}
				collaboration={collaboration}
				encryptedDraftFromUrl={encryptedDraftFromUrl}
				urlAllowedWallets={urlAllowedWallets}
				liveRoomLocked={liveRoomLocked}
				updatedAtFormatter={updatedAtFormatter}
				nowMs={nowMs}
				emailAddress={state.form.clientEmail}
				onCreateShare={() => {
					void handleCreateShare();
				}}
				onStartLiveRoom={() => {
					void handleStartLiveRoom();
				}}
				onCopy={(value, label) => {
					void copyValue(value, label);
				}}
				onImport={() => {
					void handleImport();
				}}
				onImportKeyChange={(value) => {
					dispatchPanel({ type: "SET_IMPORT_KEY", importKey: value });
				}}
			/>
		</section>
	);
}
