"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CreateState } from "./types";
import {
	decryptSharedDraft,
	encryptDraftForShare,
	generateDraftSaltHex,
	type ShareableDraft,
	shareableDraftFromState,
} from "./secureDraftShare";

const POLL_MS = 4_000;
const PUBLISH_DEBOUNCE_MS = 1_500;

interface RelaySnapshot {
	readonly eventId: string;
	readonly encryptedDraft: string;
	readonly authorWallet: string | null;
	readonly updatedAt: string;
}

interface RelayResponse {
	readonly snapshot: RelaySnapshot | null;
}

export interface CollaborationStatus {
	readonly roomId: string | null;
	readonly isLive: boolean;
	readonly isPublishing: boolean;
	readonly lastRemoteUpdateAt: string | null;
	readonly lastError: string | null;
}

function generateEventId(): string {
	const bytes = new Uint8Array(18);
	crypto.getRandomValues(bytes);
	return btoa(String.fromCharCode(...bytes))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

function channelName(roomId: string): string {
	return `trustledger-create-collab:${roomId}`;
}

async function postSnapshot(input: {
	readonly roomId: string;
	readonly eventId: string;
	readonly encryptedDraft: string;
	readonly authorWallet: string | undefined;
	readonly updatedAt: string;
}): Promise<void> {
	const response = await fetch(`/api/create-collab/${encodeURIComponent(input.roomId)}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			eventId: input.eventId,
			encryptedDraft: input.encryptedDraft,
			authorWallet: input.authorWallet ?? null,
			updatedAt: input.updatedAt,
		}),
	});
	if (!response.ok) {
		throw new Error("Unable to publish the live draft update.");
	}
}

function isDocumentVisible(): boolean {
	return typeof document === "undefined" || document.visibilityState === "visible";
}

async function fetchSnapshot(roomId: string, signal?: AbortSignal): Promise<RelaySnapshot | null> {
	const init: RequestInit = { cache: "no-store" };
	if (signal !== undefined) init.signal = signal;
	const response = await fetch(`/api/create-collab/${encodeURIComponent(roomId)}`, init);
	if (!response.ok) {
		throw new Error(
			"Unable To Load The Live Draft Room. Check The Session Link, Session Key, Wallet, Or Room Expiration.",
		);
	}
	const body = (await response.json()) as RelayResponse;
	return body.snapshot;
}

export function useEncryptedDraftCollaboration(input: {
	readonly state: CreateState;
	readonly roomId: string | null;
	readonly sessionKey: string;
	readonly connectedWallet: `0x${string}` | undefined;
	readonly allowedWallets: readonly string[];
	readonly onRemoteDraft: (draft: ShareableDraft) => void;
}): CollaborationStatus {
	const { state, roomId, connectedWallet, allowedWallets, onRemoteDraft } = input;
	const sessionKey = input.sessionKey.trim();
	const [isPublishing, setIsPublishing] = useState(false);
	const [lastRemoteUpdateAt, setLastRemoteUpdateAt] = useState<string | null>(null);
	const [lastError, setLastError] = useState<string | null>(null);
	const lastSentEventId = useRef<string | null>(null);
	const lastAppliedEventId = useRef<string | null>(null);
	const newestAppliedAt = useRef(0);
	const suppressNextPublish = useRef(false);
	const lastPublishedPayload = useRef<string | null>(null);
	const liveSaltHex = useRef<string | null>(null);
	const publishSequence = useRef(0);
	const isLive = roomId !== null && sessionKey !== "" && allowedWallets.length > 0;
	const draft = useMemo(() => shareableDraftFromState(state), [state]);
	const draftPayload = useMemo(() => JSON.stringify(draft), [draft]);

	useEffect(() => {
		liveSaltHex.current = null;
		lastPublishedPayload.current = null;
	}, [roomId, sessionKey]);

	useEffect(() => {
		if (!isLive) return;
		if (suppressNextPublish.current) {
			suppressNextPublish.current = false;
			return;
		}
		if (draftPayload === lastPublishedPayload.current) return;
		const activeRoomId = roomId;
		const controller = new AbortController();
		const sequence = publishSequence.current + 1;
		publishSequence.current = sequence;
		const timeout = window.setTimeout((): void => {
			void (async (): Promise<void> => {
				const eventId = generateEventId();
				try {
					if (controller.signal.aborted) return;
					setIsPublishing(true);
					liveSaltHex.current ??= generateDraftSaltHex();
					const encryptedDraft = await encryptDraftForShare({
						draft,
						sessionKey,
						allowedWallets,
						stableSaltHex: liveSaltHex.current,
					});
					controller.signal.throwIfAborted();
					if (sequence !== publishSequence.current) return;
					lastSentEventId.current = eventId;
					lastAppliedEventId.current = eventId;
					const updatedAt = new Date().toISOString();
					await postSnapshot({
						roomId: activeRoomId,
						eventId,
						encryptedDraft,
						authorWallet: connectedWallet,
						updatedAt,
					});
					newestAppliedAt.current = Math.max(
						newestAppliedAt.current,
						Date.parse(updatedAt),
					);
					if (typeof BroadcastChannel !== "undefined") {
						const channel = new BroadcastChannel(channelName(activeRoomId));
						channel.postMessage({
							eventId,
							encryptedDraft,
							updatedAt,
						});
						channel.close();
					}
					lastPublishedPayload.current = draftPayload;
					setLastError(null);
				} catch (error) {
					if (!controller.signal.aborted) {
						setLastError(
							error instanceof Error ? error.message : "Unable to sync draft.",
						);
					}
				} finally {
					if (!controller.signal.aborted) setIsPublishing(false);
				}
			})();
		}, PUBLISH_DEBOUNCE_MS);

		return (): void => {
			controller.abort();
			window.clearTimeout(timeout);
		};
	}, [allowedWallets, connectedWallet, draft, draftPayload, isLive, roomId, sessionKey]);

	useEffect(() => {
		if (!isLive) return;
		const activeRoomId = roomId;
		let closed = false;
		let requestInFlight = false;
		let controller: AbortController | null = null;

		async function applySnapshot(snapshot: RelaySnapshot): Promise<void> {
			if (closed) return;
			if (snapshot.eventId === lastSentEventId.current) return;
			if (snapshot.eventId === lastAppliedEventId.current) return;
			const snapshotTime = Date.parse(snapshot.updatedAt);
			if (Number.isFinite(snapshotTime) && snapshotTime < newestAppliedAt.current) return;
			const remoteDraft = await decryptSharedDraft({
				encryptedDraft: snapshot.encryptedDraft,
				sessionKey,
				walletAddress: connectedWallet,
			});
			lastAppliedEventId.current = snapshot.eventId;
			if (Number.isFinite(snapshotTime)) newestAppliedAt.current = snapshotTime;
			suppressNextPublish.current = true;
			lastPublishedPayload.current = JSON.stringify(remoteDraft);
			onRemoteDraft(remoteDraft);
			setLastRemoteUpdateAt(snapshot.updatedAt);
			setLastError(null);
		}

		const poll = (): void => {
			if (closed || requestInFlight || !isDocumentVisible()) return;
			requestInFlight = true;
			const requestController = new AbortController();
			controller = requestController;
			void (async (): Promise<void> => {
				try {
					const snapshot = await fetchSnapshot(activeRoomId, requestController.signal);
					if (snapshot !== null) {
						await applySnapshot(snapshot);
					}
				} catch (error: unknown) {
					const isAbortError =
						error instanceof DOMException && error.name === "AbortError";
					if (!isAbortError) {
						setLastError(
							error instanceof Error ? error.message : "Unable to sync draft.",
						);
					}
				} finally {
					requestInFlight = false;
				}
			})();
		};

		poll();
		const interval = window.setInterval(poll, POLL_MS);

		let channel: BroadcastChannel | null = null;
		if (typeof BroadcastChannel !== "undefined") {
			channel = new BroadcastChannel(channelName(activeRoomId));
			channel.onmessage = (event: MessageEvent<RelaySnapshot>): void => {
				void applySnapshot(event.data).catch((error: unknown) => {
					if (!closed) {
						setLastError(
							error instanceof Error ? error.message : "Unable to sync draft.",
						);
					}
				});
			};
		}

		return (): void => {
			closed = true;
			window.clearInterval(interval);
			controller?.abort();
			channel?.close();
		};
	}, [connectedWallet, isLive, onRemoteDraft, roomId, sessionKey]);

	return {
		roomId,
		isLive,
		isPublishing,
		lastRemoteUpdateAt,
		lastError,
	};
}
