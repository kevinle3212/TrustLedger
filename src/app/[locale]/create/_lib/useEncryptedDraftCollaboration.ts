"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CreateState } from "./types";
import {
	decryptSharedDraft,
	encryptDraftForShare,
	type ShareableDraft,
	shareableDraftFromState,
} from "./secureDraftShare";

const POLL_MS = 2_000;
const PUBLISH_DEBOUNCE_MS = 750;

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

async function fetchSnapshot(roomId: string): Promise<RelaySnapshot | null> {
	const response = await fetch(`/api/create-collab/${encodeURIComponent(roomId)}`, {
		cache: "no-store",
	});
	if (!response.ok) {
		throw new Error("Unable to load the live draft room.");
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
	const suppressNextPublish = useRef(false);
	const isLive = roomId !== null && sessionKey !== "" && allowedWallets.length > 0;
	const draft = useMemo(() => shareableDraftFromState(state), [state]);

	useEffect(() => {
		if (!isLive) return;
		if (suppressNextPublish.current) {
			suppressNextPublish.current = false;
			return;
		}
		const activeRoomId = roomId;
		const controller = new AbortController();
		const timeout = window.setTimeout((): void => {
			void (async (): Promise<void> => {
				const eventId = generateEventId();
				try {
					setIsPublishing(true);
					const encryptedDraft = await encryptDraftForShare({
						draft,
						sessionKey,
						allowedWallets,
					});
					if (controller.signal.aborted) return;
					lastSentEventId.current = eventId;
					lastAppliedEventId.current = eventId;
					await postSnapshot({
						roomId: activeRoomId,
						eventId,
						encryptedDraft,
						authorWallet: connectedWallet,
						updatedAt: new Date().toISOString(),
					});
					if (typeof BroadcastChannel !== "undefined") {
						const channel = new BroadcastChannel(channelName(activeRoomId));
						channel.postMessage({
							eventId,
							encryptedDraft,
							updatedAt: new Date().toISOString(),
						});
						channel.close();
					}
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
	}, [allowedWallets, connectedWallet, draft, isLive, roomId, sessionKey]);

	useEffect(() => {
		if (!isLive) return;
		const activeRoomId = roomId;
		let closed = false;

		async function applySnapshot(snapshot: RelaySnapshot): Promise<void> {
			if (closed) return;
			if (snapshot.eventId === lastSentEventId.current) return;
			if (snapshot.eventId === lastAppliedEventId.current) return;
			const remoteDraft = await decryptSharedDraft({
				encryptedDraft: snapshot.encryptedDraft,
				sessionKey,
				walletAddress: connectedWallet,
			});
			lastAppliedEventId.current = snapshot.eventId;
			suppressNextPublish.current = true;
			onRemoteDraft(remoteDraft);
			setLastRemoteUpdateAt(snapshot.updatedAt);
			setLastError(null);
		}

		const interval = window.setInterval((): void => {
			void (async (): Promise<void> => {
				try {
					const snapshot = await fetchSnapshot(activeRoomId);
					if (snapshot !== null) {
						await applySnapshot(snapshot);
					}
				} catch (error: unknown) {
					if (!closed) {
						setLastError(
							error instanceof Error ? error.message : "Unable to sync draft.",
						);
					}
				}
			})();
		}, POLL_MS);

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
