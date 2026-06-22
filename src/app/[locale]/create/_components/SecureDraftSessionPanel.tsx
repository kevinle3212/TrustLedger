"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useVisibleTimestamp } from "@/hooks/useVisibleTimestamp";
import { copyToClipboard } from "@/security/clipboard";
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
	readonly submissionComplete: boolean;
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
	| { readonly type: "SET_STATUS"; readonly status: PanelStatus | null }
	| { readonly type: "CLEAR_SHARE_SECRETS" };

const SHARE_ACTION_COOLDOWN_MS = 10_000;
const TERMS_HISTORY_LIMIT = 100;

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
		case "CLEAR_SHARE_SECRETS":
			return {
				...state,
				shareUrl: "",
				sessionKey: "",
				importKey: "",
				roomId: null,
				isSharing: false,
				isStartingLiveRoom: false,
				isImporting: false,
				cooldownUntil: 0,
			};
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
			? "Updated less than 1 minute ago"
			: `Updated ${diffMinutes.toString()} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
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

function snippetFor(
	format: ContractTermsFormat,
	action: EditorSnippet,
	selectedText = "",
): { readonly text: string; readonly selectionStart: number; readonly selectionEnd: number } {
	const hasSelection = selectedText.trim() !== "";
	if (format === "html") {
		const htmlSnippets = {
			bold: { before: "<strong>", value: "Important Term", after: "</strong>" },
			italic: { before: "<em>", value: "Clarifying Note", after: "</em>" },
			h1: { before: "<h1>", value: "Primary Heading", after: "</h1>" },
			h2: { before: "<h2>", value: "Section Heading", after: "</h2>" },
			h3: { before: "<h3>", value: "Subsection Heading", after: "</h3>" },
			h4: { before: "<h4>", value: "Detail Heading", after: "</h4>" },
			paragraph: { before: "<p>", value: "Contract paragraph goes here.", after: "</p>" },
			link: {
				before: '<a href="https://example.com">',
				value: "Reference Link",
				after: "</a>",
			},
			image: '<img src="https://example.com/image.png" alt="Contract Attachment" />',
			list: "<ul>\n  <li>Contract Obligation</li>\n</ul>",
			quote: {
				before: "<blockquote>",
				value: "Quoted contract language.",
				after: "</blockquote>",
			},
			code: { before: "<code>", value: "Defined Term", after: "</code>" },
		} satisfies Record<
			EditorSnippet,
			string | { readonly before: string; readonly value: string; readonly after: string }
		>;
		const snippet = htmlSnippets[action];
		if (typeof snippet === "string") {
			return { text: snippet, selectionStart: snippet.length, selectionEnd: snippet.length };
		}
		const value = hasSelection ? selectedText : snippet.value;
		const text = `${snippet.before}${value}${snippet.after}`;
		const selectionStart = snippet.before.length;
		return {
			text,
			selectionStart,
			selectionEnd: selectionStart + value.length,
		};
	}
	if (format === "markdown") {
		const markdownSnippets = {
			bold: { before: "**", value: "Important Term", after: "**" },
			italic: { before: "_", value: "Clarifying Note", after: "_" },
			h1: { before: "# ", value: "Primary Heading", after: "" },
			h2: { before: "## ", value: "Section Heading", after: "" },
			h3: { before: "### ", value: "Subsection Heading", after: "" },
			h4: { before: "#### ", value: "Detail Heading", after: "" },
			paragraph: "Contract paragraph goes here.",
			link: { before: "[", value: "Reference Link", after: "](https://example.com)" },
			image: "![Contract Attachment](https://example.com/image.png)",
			list: "- Contract Obligation",
			quote: "> Quoted contract language.",
			code: { before: "`", value: "Defined Term", after: "`" },
		} satisfies Record<
			EditorSnippet,
			string | { readonly before: string; readonly value: string; readonly after: string }
		>;
		const snippet = markdownSnippets[action];
		if (typeof snippet === "string") {
			return { text: snippet, selectionStart: snippet.length, selectionEnd: snippet.length };
		}
		const value = hasSelection ? selectedText : snippet.value;
		const text = `${snippet.before}${value}${snippet.after}`;
		const selectionStart = snippet.before.length;
		return {
			text,
			selectionStart,
			selectionEnd: selectionStart + value.length,
		};
	}
	const plainSnippets = {
		bold: "Important Term",
		italic: "Clarifying Note",
		h1: "Primary Heading",
		h2: "Section Heading",
		h3: "Subsection Heading",
		h4: "Detail Heading",
		paragraph: "Contract paragraph goes here.",
		link: "Reference Link: https://example.com",
		image: "Contract Attachment: https://example.com/image.png",
		list: "- Contract Obligation",
		quote: "Quoted contract language.",
		code: "Defined Term",
	} satisfies Record<EditorSnippet, string>;
	const text = hasSelection ? selectedText : plainSnippets[action];
	return { text, selectionStart: 0, selectionEnd: text.length };
}

function formatLabel(
	format: ContractTermsFormat,
	t: ReturnType<typeof useTranslations<"Create">>,
): string {
	if (format === "html") return "HTML";
	if (format === "plain") return t("plainText");
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

function openEmailShare(href: string): void {
	if (href === "") return;
	window.location.href = href;
}

function removeDraftShareParamsFromUrl(): void {
	const url = new URL(window.location.href);
	url.searchParams.delete("tl_draft");
	url.searchParams.delete("tl_room");
	window.history.replaceState(null, "", url.toString());
}

async function deleteLiveRoomSnapshot(roomId: string | null): Promise<void> {
	if (roomId === null) return;
	await fetch(`/api/create-collab/${encodeURIComponent(roomId)}`, { method: "DELETE" });
}

function DraftTermsEditor({
	state,
	collaboration,
	updatedAtFormatter,
	nowMs,
	onTermsBodyChange,
	onTermsFormatChange,
	onTermsUndo,
	onTermsRedo,
}: {
	readonly state: CreateState;
	readonly collaboration: ReturnType<typeof useEncryptedDraftCollaboration>;
	readonly updatedAtFormatter: Intl.DateTimeFormat;
	readonly nowMs: number;
	readonly onTermsBodyChange: (value: string) => void;
	readonly onTermsFormatChange: (format: ContractTermsFormat) => void;
	readonly onTermsUndo: () => void;
	readonly onTermsRedo: () => void;
}): React.JSX.Element {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);
	const t = useTranslations("Create");
	const visibleSnippets =
		state.termsFormat === "markdown"
			? MARKDOWN_SNIPPETS
			: state.termsFormat === "html"
				? HTML_SNIPPETS
				: MARKDOWN_SNIPPETS;

	function insertSnippet(action: EditorSnippet, overrideText?: string): void {
		const textarea = textareaRef.current;
		const textareaHasFocus = textarea !== null && document.activeElement === textarea;
		const selectionStart = textareaHasFocus ? textarea.selectionStart : state.termsBody.length;
		const selectionEnd = textareaHasFocus ? textarea.selectionEnd : state.termsBody.length;
		const selectedText = state.termsBody.slice(selectionStart, selectionEnd);
		const snippet =
			overrideText === undefined
				? snippetFor(state.termsFormat, action, selectedText)
				: {
						text: overrideText,
						selectionStart: overrideText.length,
						selectionEnd: overrideText.length,
					};
		const needsLeadingBreak =
			selectionStart > 0 &&
			!state.termsBody.slice(0, selectionStart).endsWith("\n") &&
			(!textareaHasFocus ||
				action === "h1" ||
				action === "h2" ||
				action === "h3" ||
				action === "h4" ||
				action === "list" ||
				action === "quote");
		const prefix = needsLeadingBreak ? "\n" : "";
		const nextValue = `${state.termsBody.slice(0, selectionStart)}${prefix}${snippet.text}${state.termsBody.slice(selectionEnd)}`;
		const nextSelectionStart = selectionStart + prefix.length + snippet.selectionStart;
		const nextSelectionEnd = selectionStart + prefix.length + snippet.selectionEnd;
		onTermsBodyChange(nextValue);
		window.requestAnimationFrame(() => {
			textarea?.focus();
			textarea?.setSelectionRange(nextSelectionStart, nextSelectionEnd);
		});
	}

	function insertImageFile(file: File): void {
		if (!file.type.startsWith("image/")) return;
		const reader = new FileReader();
		reader.onload = (): void => {
			const dataUrl = typeof reader.result === "string" ? reader.result : "";
			if (dataUrl === "") return;
			const altText = file.name
				.replace(/\.[^.]+$/u, "")
				.replace(/[-_]+/gu, " ")
				.trim();
			const safeAltText = altText === "" ? t("contractAttachmentAlt") : altText;
			const imageMarkup =
				state.termsFormat === "html"
					? `<img src="${dataUrl}" alt="${safeAltText}" />`
					: state.termsFormat === "markdown"
						? `![${safeAltText}](${dataUrl})`
						: `${t("contractAttachmentAlt")}: ${file.name}`;
			insertSnippet("image", imageMarkup);
		};
		reader.readAsDataURL(file);
	}

	return (
		<>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
						{t("secureDraftSession")}
					</p>
					<h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
						{t("collaborativeContractTerms")}
					</h2>
					<p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("secureDraftBody")}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<p className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300">
						{t("lastUpdated")}{" "}
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
								? t("syncingLive")
								: t("liveSyncOn")
							: t("liveSyncOff")}
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
						{formatLabel(format, t)}
					</button>
				))}
				<button
					type="button"
					onClick={() => {
						onTermsBodyChange(DEFAULT_CONTRACT_TERMS[state.termsFormat]);
					}}
					className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:border-emerald-300 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"
				>
					{t("insertDefaultTemplate")}
				</button>
				{visibleSnippets.map(([action, label]) => (
					<button
						key={action}
						type="button"
						aria-label={t("insertSnippetAria", { label })}
						onMouseDown={(event) => {
							event.preventDefault();
						}}
						onClick={() => {
							if (action === "image") {
								imageInputRef.current?.click();
								return;
							}
							insertSnippet(action);
						}}
						className={`tl-editor-tool rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-indigo-300/40 dark:hover:bg-indigo-400/10 dark:hover:text-indigo-100 ${
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
				<input
					ref={imageInputRef}
					type="file"
					accept="image/*"
					className="sr-only"
					aria-label={t("uploadTermsImage")}
					onChange={(event) => {
						const file = event.currentTarget.files?.[0];
						if (file !== undefined) insertImageFile(file);
					}}
				/>
			</div>

			<textarea
				ref={textareaRef}
				aria-label={t("termsEditorAria")}
				value={state.termsBody}
				onChange={(event) => {
					onTermsBodyChange(event.target.value);
				}}
				onKeyDown={(event) => {
					const key = event.key.toLowerCase();
					const isModifierKey = event.metaKey || event.ctrlKey;
					const isRedoShortcut =
						isModifierKey && (key === "y" || (event.shiftKey && key === "z"));
					if (isRedoShortcut) {
						event.preventDefault();
						onTermsRedo();
						return;
					}
					if (isModifierKey && key === "z") {
						event.preventDefault();
						onTermsUndo();
					}
				}}
				rows={9}
				spellCheck
				className="mt-4 min-h-56 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-white"
				placeholder={t("termsPlaceholder")}
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
	onEmailShare,
	onEndLiveRoom,
	onImport,
	onImportKeyChange,
	copiedLabel,
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
	readonly onEmailShare: (href: string) => void;
	readonly onEndLiveRoom: () => void;
	readonly onImport: () => void;
	readonly onImportKeyChange: (value: string) => void;
	readonly copiedLabel: string | null;
}): React.JSX.Element {
	const t = useTranslations("Create");
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
						{t("allowedWallet")}
					</p>
					<p className="mt-1 break-all font-mono text-gray-800 dark:text-gray-100">
						{connected ?? t("connectYourWallet")}
					</p>
				</div>
				<div className="tl-wallet-chip rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-400/20 dark:bg-indigo-400/10">
					<p className="font-semibold uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-200">
						{t("counterpartyWallet")}
					</p>
					<p className="mt-1 break-all font-mono text-gray-800 dark:text-gray-100">
						{counterparty ?? t("enterCounterpartyWallet")}
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
						? t("creatingEncryptedLink")
						: cooldownActive
							? t("createLinkIn", { seconds: secondsRemaining })
							: t("createEncryptedShareLink")}
				</button>
				<button
					type="button"
					onClick={onStartLiveRoom}
					disabled={panel.isStartingLiveRoom || liveRoomLocked || cooldownActive}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:border-indigo-300 hover:text-indigo-900 disabled:opacity-50 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200 dark:hover:border-indigo-300/50"
				>
					{panel.isStartingLiveRoom
						? t("startingLiveRoom")
						: cooldownActive
							? t("startLiveRoomIn", { seconds: secondsRemaining })
							: liveRoomLocked
								? t("liveRoomStarted")
								: t("startLiveRoom")}
				</button>
				<button
					type="button"
					onClick={() => {
						onCopy(panel.shareUrl, "Link");
					}}
					disabled={panel.shareUrl === ""}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-gray-200"
				>
					{copiedLabel === "Link" ? t("copied") : t("copyLink")}
				</button>
				<button
					type="button"
					onClick={() => {
						onCopy(panel.sessionKey, "Session Key");
					}}
					disabled={panel.sessionKey === ""}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 disabled:opacity-50 dark:border-white/10 dark:text-gray-200"
				>
					{copiedLabel === "Session Key" ? t("copied") : t("copySessionKey")}
				</button>
				<button
					type="button"
					onClick={() => {
						onEmailShare(emailHref);
					}}
					disabled={emailHref === ""}
					className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-300 disabled:opacity-50 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100"
				>
					{t("emailLinkAndKey")}
				</button>
				{panel.roomId !== null && (
					<button
						type="button"
						onClick={onEndLiveRoom}
						className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-300 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
					>
						{t("endLiveSync")}
					</button>
				)}
			</div>
			{panel.generationCount > 0 && (
				<p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
					{t("replaceLinkWarning")}
				</p>
			)}
			{panel.shareUrl !== "" && (
				<div className="grid gap-2 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
					<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
						{t("shareLink")}
					</p>
					<p className="break-all font-mono text-xs text-gray-600 dark:text-gray-300">
						{panel.shareUrl}
					</p>
				</div>
			)}
			{collaboration.isLive && (
				<p className="text-xs text-gray-600 dark:text-gray-300">
					{t("liveRoomStatus", {
						roomId: panel.roomId ?? "",
						time: formatUpdatedAt(
							collaboration.lastRemoteUpdateAt,
							updatedAtFormatter,
							nowMs,
						),
					})}
				</p>
			)}
			{collaboration.lastError !== null && (
				<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
					{collaboration.lastError.replace(
						"Unable to load the live draft room.",
						t("liveRoomLoadAdvice"),
					)}
				</p>
			)}
			{encryptedDraftFromUrl !== null && (
				<div className="grid gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
					<p className="text-xs text-gray-600 dark:text-gray-300">
						{t("encryptedDraftNotice", {
							wallets:
								urlAllowedWallets.length > 0
									? urlAllowedWallets.join(", ")
									: t("allowedWallets"),
						})}
					</p>
					<div className="flex flex-col gap-2 sm:flex-row">
						<input
							aria-label={t("sessionKey")}
							value={panel.importKey}
							onChange={(event) => {
								onImportKeyChange(event.target.value);
							}}
							placeholder={t("pasteSessionKey")}
							className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
						<button
							type="button"
							onClick={onImport}
							disabled={panel.isImporting}
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950"
						>
							{panel.isImporting ? t("importingDraft") : t("importDraft")}
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

function useSecureDraftSessionPanelController({
	state,
	connectedWallet,
	submissionComplete,
	onTermsBodyChange,
	onImportDraft,
}: SecureDraftSessionPanelProps): {
	readonly panel: PanelState;
	readonly connected: string | undefined;
	readonly counterparty: string | undefined;
	readonly collaboration: ReturnType<typeof useEncryptedDraftCollaboration>;
	readonly encryptedDraftFromUrl: string | null;
	readonly urlAllowedWallets: readonly string[];
	readonly liveRoomLocked: boolean;
	readonly updatedAtFormatter: Intl.DateTimeFormat;
	readonly nowMs: number;
	readonly copiedLabel: string | null;
	readonly updateTermsBodyWithHistory: (value: string) => void;
	readonly undoTermsBody: () => void;
	readonly redoTermsBody: () => void;
	readonly handleCreateShare: () => Promise<void>;
	readonly handleStartLiveRoom: () => Promise<void>;
	readonly copyValue: (value: string, label: string) => Promise<boolean>;
	readonly clearShareSecrets: (statusText: string) => Promise<void>;
	readonly handleImport: () => Promise<void>;
	readonly setImportKey: (value: string) => void;
} {
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
	const copyFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const termsHistory = useRef<string[]>([state.termsBody]);
	const termsHistoryIndex = useRef(0);
	const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
	const nowMs = useVisibleTimestamp(1000);
	const encryptedDraftFromUrl = useMemo(() => getEncryptedDraftFromUrl(), []);
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

	const recordTermsHistory = useCallback((value: string): void => {
		const currentValue = termsHistory.current[termsHistoryIndex.current];
		if (value === currentValue) return;
		const nextHistory = termsHistory.current.slice(0, termsHistoryIndex.current + 1);
		nextHistory.push(value);
		if (nextHistory.length > TERMS_HISTORY_LIMIT) {
			nextHistory.shift();
		} else {
			termsHistoryIndex.current += 1;
		}
		termsHistory.current = nextHistory;
	}, []);

	const updateTermsBodyWithHistory = useCallback(
		(value: string): void => {
			recordTermsHistory(value);
			onTermsBodyChange(value);
		},
		[onTermsBodyChange, recordTermsHistory],
	);

	const undoTermsBody = useCallback((): void => {
		if (termsHistoryIndex.current <= 0) return;
		termsHistoryIndex.current -= 1;
		onTermsBodyChange(termsHistory.current[termsHistoryIndex.current] ?? "");
	}, [onTermsBodyChange]);

	const redoTermsBody = useCallback((): void => {
		if (termsHistoryIndex.current >= termsHistory.current.length - 1) return;
		termsHistoryIndex.current += 1;
		onTermsBodyChange(termsHistory.current[termsHistoryIndex.current] ?? "");
	}, [onTermsBodyChange]);

	useEffect(() => {
		recordTermsHistory(state.termsBody);
	}, [recordTermsHistory, state.termsBody]);

	const updateStatus = useCallback((tone: "success" | "error" | "info", text: string): void => {
		dispatchPanel({ type: "SET_STATUS", status: { tone, text } });
	}, []);

	async function copyValue(value: string, label: string): Promise<boolean> {
		if (value === "") return false;
		// Best-effort copy; never throws, so a denied/unavailable clipboard surfaces
		// as a recoverable status message rather than an uncaught error.
		if (!(await copyToClipboard(value))) {
			updateStatus(
				"error",
				`Unable to copy ${label}. Copy it manually from the share link field below.`,
			);
			return false;
		}
		setCopiedLabel(label);
		if (copyFeedbackTimeout.current !== null) {
			clearTimeout(copyFeedbackTimeout.current);
		}
		copyFeedbackTimeout.current = setTimeout(() => {
			setCopiedLabel(null);
		}, 1500);
		updateStatus("success", "Copied!");
		return true;
	}

	const clearShareSecrets = useCallback(
		async (statusText: string): Promise<void> => {
			const roomId = panel.roomId;
			dispatchPanel({ type: "CLEAR_SHARE_SECRETS" });
			setCopiedLabel(null);
			removeDraftShareParamsFromUrl();
			try {
				await deleteLiveRoomSnapshot(roomId);
			} catch {
				// The local keys are still cleared even if the transient relay room is already gone.
			}
			updateStatus("success", statusText);
		},
		[panel.roomId, updateStatus],
	);

	useEffect(
		(): (() => void) => () => {
			if (copyFeedbackTimeout.current !== null) clearTimeout(copyFeedbackTimeout.current);
		},
		[],
	);

	useEffect(() => {
		if (!submissionComplete) return;
		const timeout = window.setTimeout(() => {
			void clearShareSecrets("Draft share links and session keys cleared after submission.");
		}, 0);
		return (): void => {
			window.clearTimeout(timeout);
		};
	}, [clearShareSecrets, submissionComplete]);

	async function handleCreateShare(): Promise<void> {
		if (panel.isSharing) return;
		if (Date.now() < panel.cooldownUntil) return;
		if (allowedWallets.length === 0) {
			updateStatus(
				"error",
				"Connect your wallet or enter the counterparty wallet before sharing.",
			);
			return;
		}
		dispatchPanel({ type: "SET_SHARING", isSharing: true });
		updateStatus("info", "Creating encrypted session link...");
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
				"Encrypted share link created. Send the session key separately.",
			);
		} catch {
			updateStatus("error", "Unable to create the encrypted session link in this browser.");
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
				"Connect your wallet or enter the counterparty wallet before starting live sync.",
			);
			return;
		}
		lastRoomStartAt.current = now;
		dispatchPanel({ type: "SET_STARTING_LIVE_ROOM", isStartingLiveRoom: true });
		updateStatus("info", "Starting encrypted live room...");
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
			updateStatus("error", "Unable to start the encrypted live room in this browser.");
		} finally {
			dispatchPanel({ type: "SET_STARTING_LIVE_ROOM", isStartingLiveRoom: false });
		}
	}

	async function handleImport(): Promise<void> {
		if (panel.isImporting) return;
		if (encryptedDraftFromUrl === null) {
			updateStatus("error", "No encrypted draft was found in this URL.");
			return;
		}
		if (panel.importKey.trim() === "") {
			updateStatus("error", "Paste the separate session key before importing.");
			return;
		}
		dispatchPanel({ type: "SET_IMPORTING", isImporting: true });
		updateStatus("info", "Decrypting draft...");
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
				"Draft imported. Live updates stay enabled while this page is open.",
			);
		} catch (error) {
			updateStatus(
				"error",
				error instanceof Error
					? error.message.replace(
							"Unable to load the live draft room.",
							"Unable to load the live draft room. Check the session link, key, wallet, or room expiration.",
						)
					: "Unable to import draft.",
			);
		} finally {
			dispatchPanel({ type: "SET_IMPORTING", isImporting: false });
		}
	}

	return {
		panel,
		connected,
		counterparty,
		collaboration,
		encryptedDraftFromUrl,
		urlAllowedWallets,
		liveRoomLocked,
		updatedAtFormatter,
		nowMs,
		copiedLabel,
		updateTermsBodyWithHistory,
		undoTermsBody,
		redoTermsBody,
		handleCreateShare,
		handleStartLiveRoom,
		copyValue,
		clearShareSecrets,
		handleImport,
		setImportKey: (value: string): void => {
			dispatchPanel({ type: "SET_IMPORT_KEY", importKey: value });
		},
	};
}

export function SecureDraftSessionPanel(props: SecureDraftSessionPanelProps): React.JSX.Element {
	const {
		panel,
		connected,
		counterparty,
		collaboration,
		encryptedDraftFromUrl,
		urlAllowedWallets,
		liveRoomLocked,
		updatedAtFormatter,
		nowMs,
		copiedLabel,
		updateTermsBodyWithHistory,
		undoTermsBody,
		redoTermsBody,
		handleCreateShare,
		handleStartLiveRoom,
		copyValue,
		clearShareSecrets,
		handleImport,
		setImportKey,
	} = useSecureDraftSessionPanelController(props);

	return (
		<section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
			<DraftTermsEditor
				state={props.state}
				collaboration={collaboration}
				updatedAtFormatter={updatedAtFormatter}
				nowMs={nowMs}
				onTermsBodyChange={updateTermsBodyWithHistory}
				onTermsFormatChange={props.onTermsFormatChange}
				onTermsUndo={undoTermsBody}
				onTermsRedo={redoTermsBody}
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
				emailAddress={props.state.form.clientEmail}
				onCreateShare={() => {
					void handleCreateShare();
				}}
				onStartLiveRoom={() => {
					void handleStartLiveRoom();
				}}
				onCopy={(value, label) => {
					void copyValue(value, label);
				}}
				onEmailShare={openEmailShare}
				onEndLiveRoom={() => {
					void clearShareSecrets(
						"Live sync ended. Share links and session keys were cleared.",
					);
				}}
				onImport={() => {
					void handleImport();
				}}
				onImportKeyChange={setImportKey}
				copiedLabel={copiedLabel}
			/>
		</section>
	);
}
