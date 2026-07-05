"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { authedFetch } from "@/lib/authedFetch";
import { decryptMessage, encryptMessage } from "@/lib/crypto/e2e";
import { MessageComposer, type ComposerNotice } from "@/components/messages/MessageComposer";
import { MessageThread } from "@/components/messages/MessageThread";
import type { DecryptedMessage } from "@/components/messages/types";

interface RawMessage {
	readonly id: string;
	readonly senderAddress: string;
	readonly ciphertext: string;
	readonly nonce: string;
	readonly moderationFlag: string | null;
	readonly moderationCategories: readonly string[] | null;
	readonly createdAt: string;
}

type ThreadState =
	| { readonly status: "loading" }
	| { readonly status: "error"; readonly message: string }
	| { readonly status: "ready"; readonly messages: readonly DecryptedMessage[] };

function decodeMessage(raw: RawMessage, key: Uint8Array | null): DecryptedMessage {
	let text: string | null = null;
	if (key !== null) {
		try {
			text = decryptMessage(raw.ciphertext, raw.nonce, key);
		} catch {
			text = null;
		}
	}
	return {
		id: raw.id,
		senderAddress: raw.senderAddress,
		createdAt: raw.createdAt,
		text,
		moderationFlag: raw.moderationFlag,
		moderationCategories: raw.moderationCategories ?? [],
	};
}

/**
 * The active conversation: loads and decrypts its messages, marks them read,
 * and owns the moderate-then-encrypt send pipeline. Remounted (via a `key`
 * prop on `conversationId`) whenever the selected conversation changes.
 */
export function ActiveThreadPanel({
	conversationId,
	peerAddress,
	myAddress,
	token,
	getConversationKey,
	onMessagesChanged,
}: {
	readonly conversationId: string;
	readonly peerAddress: string;
	readonly myAddress: string;
	readonly token: string;
	readonly getConversationKey: (
		conversationId: string,
		peerAddress: string,
	) => Promise<Uint8Array | null>;
	readonly onMessagesChanged: () => void;
}): React.JSX.Element {
	const t = useTranslations("Messaging");
	const [thread, setThread] = useState<ThreadState>({ status: "loading" });
	const [sendState, setSendState] = useState<{ sending: boolean; notice: ComposerNotice }>({
		sending: false,
		notice: null,
	});

	const loadThread = useCallback(async (): Promise<void> => {
		setThread({ status: "loading" });
		try {
			const key = await getConversationKey(conversationId, peerAddress);
			const response = await authedFetch(
				token,
				`/api/messages/conversations/${conversationId}`,
			);
			if (!response.ok) throw new Error(t("loadError"));
			const body = (await response.json()) as { messages: RawMessage[] };
			setThread({
				status: "ready",
				messages: body.messages.map((raw) => decodeMessage(raw, key)),
			});
			await authedFetch(token, `/api/messages/conversations/${conversationId}/read`, {
				method: "POST",
			});
			onMessagesChanged();
		} catch (caught) {
			setThread({
				status: "error",
				message: caught instanceof Error ? caught.message : t("loadError"),
			});
		}
	}, [conversationId, peerAddress, token, getConversationKey, onMessagesChanged, t]);

	// Reruns only when the conversation identity changes. loadThread is
	// intentionally excluded: it is recreated whenever peerAddress/token/
	// getConversationKey change, which would refire this effect on every render
	// of those stable-but-not-identity-stable values.
	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(() => {
		void (async (): Promise<void> => {
			await loadThread();
		})();
		// react-doctor-disable-next-line react-doctor/exhaustive-deps -- see comment above; reruns only when the conversation identity changes.
	}, [conversationId]);
	/* eslint-enable react-hooks/exhaustive-deps */

	async function sendMessage(text: string): Promise<void> {
		setSendState({ sending: true, notice: null });
		try {
			const moderationResponse = await authedFetch(token, "/api/messages/moderate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text }),
			});
			const moderation = (await moderationResponse.json()) as {
				decision: "allow" | "flag" | "block";
				categories: string[];
				reason?: string;
			};
			if (moderation.decision === "block") {
				setSendState({
					sending: false,
					notice: { kind: "blocked", reason: moderation.reason },
				});
				return;
			}
			const key = await getConversationKey(conversationId, peerAddress);
			if (key === null) {
				setSendState({
					sending: false,
					notice: { kind: "error", message: t("keyLoadError") },
				});
				return;
			}
			const encrypted = encryptMessage(text, key);
			const response = await authedFetch(
				token,
				`/api/messages/conversations/${conversationId}`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						ciphertext: encrypted.ciphertext,
						nonce: encrypted.nonce,
						...(moderation.decision === "flag"
							? {
									moderationFlag: "flag",
									moderationCategories: moderation.categories,
								}
							: {}),
					}),
				},
			);
			if (!response.ok) {
				setSendState({
					sending: false,
					notice: { kind: "error", message: t("sendError") },
				});
				return;
			}
			setSendState({ sending: false, notice: null });
			await loadThread();
		} catch {
			setSendState({ sending: false, notice: { kind: "error", message: t("sendError") } });
		}
	}

	return (
		<>
			<div className="flex-1 overflow-y-auto">
				{thread.status === "error" ? (
					<p role="alert" className="text-sm text-red-600 dark:text-red-400">
						{thread.message}
					</p>
				) : (
					<MessageThread
						messages={thread.status === "ready" ? thread.messages : []}
						myAddress={myAddress}
					/>
				)}
			</div>
			<MessageComposer
				sending={sendState.sending}
				notice={sendState.notice}
				onSend={(text) => {
					void sendMessage(text);
				}}
			/>
		</>
	);
}
