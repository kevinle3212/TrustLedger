// react-doctor-disable-next-line react-doctor/nextjs-missing-metadata -- Client Component; metadata is provided by the sibling app/[locale]/messages/layout.tsx (the same App Router pattern used for dashboard/reputation).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";

import {
	isWalletRestoringStatus,
	WalletRequiredPage,
	WalletRestoringPage,
} from "@/components/WalletRequiredPage";
import { TotpStepUpPrompt } from "@/components/TotpStepUpPrompt";
import { ActiveThreadPanel } from "@/components/messages/ActiveThreadPanel";
import { ConversationList } from "@/components/messages/ConversationList";
import type { ConversationSummary } from "@/components/messages/types";
import { authedFetch } from "@/lib/authedFetch";
import { useAccountSession } from "@/lib/accountSession";
import {
	deriveConversationKey,
	fetchPeerPublicKey,
	useMessagingIdentity,
} from "@/lib/messagingCrypto";

/** The currently open conversation: its id and the peer's wallet address. */
interface SelectedConversation {
	readonly id: string;
	readonly peer: string;
}

/**
 * The encrypted messaging page: a conversation list, an "open by wallet
 * address" form, and the active thread with a moderate-then-encrypt send
 * pipeline. Wallet-gated; sets up (or loads) the messaging identity on first
 * entry and decrypts every message client-side.
 */
export default function MessagesPage(): React.JSX.Element {
	const t = useTranslations("Messaging");
	const { address, isConnected, status } = useAccount();
	const session = useAccountSession();
	const identity = useMessagingIdentity(session.token);

	const [conversations, setConversations] = useState<ConversationSummary[]>([]);
	const [selected, setSelected] = useState<SelectedConversation | null>(null);
	const conversationKeysRef = useRef<Map<string, Uint8Array> | null>(null);
	conversationKeysRef.current ??= new Map();

	const ready =
		session.status === "ready" && identity.status === "ready" && identity.identity !== null;

	const loadConversations = useCallback(async (): Promise<void> => {
		if (session.token === null) return;
		const response = await authedFetch(session.token, "/api/messages/conversations");
		if (!response.ok) return;
		const body = (await response.json()) as { conversations: ConversationSummary[] };
		setConversations(body.conversations);
	}, [session.token]);

	// Bootstraps the session and messaging identity once on entry, then loads
	// the conversation list once both are ready. session.ensureSession,
	// identity.ensureIdentity, and loadConversations are intentionally excluded
	// from the dependency array: this must run once per wallet connection, not
	// re-run every time those helpers' identities change as a side effect of the
	// calls they themselves make.
	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(() => {
		if (!isConnected) return;
		void (async (): Promise<void> => {
			const token = await session.ensureSession();
			if (token === null) return;
			const nextIdentity = await identity.ensureIdentity();
			if (nextIdentity === null) return;
			await loadConversations();
		})();
		// react-doctor-disable-next-line react-doctor/exhaustive-deps -- see comment above; the effect must run once per wallet connection.
	}, [isConnected]);
	/* eslint-enable react-hooks/exhaustive-deps */

	const getConversationKey = useCallback(
		async (conversationId: string, peerAddress: string): Promise<Uint8Array | null> => {
			const cache = conversationKeysRef.current;
			const cached = cache?.get(conversationId);
			if (cached !== undefined) return cached;
			if (session.token === null || identity.identity === null || address === undefined)
				return null;
			const peerPublicKey = await fetchPeerPublicKey(session.token, peerAddress);
			if (peerPublicKey === null) return null;
			const key = deriveConversationKey(
				identity.identity.privateKey,
				peerPublicKey,
				address,
				peerAddress,
			);
			cache?.set(conversationId, key);
			return key;
		},
		[session.token, identity.identity, address],
	);

	function selectConversation(conversationId: string): void {
		const conversation = conversations.find((item) => item.id === conversationId);
		if (conversation === undefined) return;
		setSelected({ id: conversationId, peer: conversation.peer });
	}

	async function openByAddress(peerAddress: string): Promise<void> {
		if (session.token === null) return;
		const response = await authedFetch(session.token, "/api/messages/conversations", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ peerAddress }),
		});
		if (!response.ok) return;
		const body = (await response.json()) as { id: string };
		await loadConversations();
		setSelected({ id: body.id, peer: peerAddress });
	}

	if (!isConnected || address === undefined) {
		if (isWalletRestoringStatus(status)) return <WalletRestoringPage />;
		return <WalletRequiredPage />;
	}

	if (session.status === "totp-required") {
		return (
			<main className="tl-site-frame py-12">
				<TotpStepUpPrompt
					error={session.error}
					onCancel={session.cancelTotp}
					onSubmit={(code) => {
						void session.promptTotp(code);
					}}
				/>
			</main>
		);
	}

	return (
		<main className="tl-site-frame py-12">
			<h1 className="text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-4xl dark:text-white">
				{t("pageTitle")}
			</h1>
			<p className="mt-3 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
				{t("pageIntro")}
			</p>

			{!ready ? (
				<p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
					{identity.error ?? session.error ?? t("keySetupStatus")}
				</p>
			) : (
				<section className="mt-8 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
					<div className="tl-motion-card rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
						<ConversationList
							conversations={conversations}
							selectedId={selected?.id ?? null}
							onSelect={selectConversation}
							onOpenByAddress={(peerAddress) => {
								void openByAddress(peerAddress);
							}}
						/>
					</div>
					<div className="tl-motion-card flex min-h-[24rem] flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
						{selected === null || session.token === null ? (
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{t("selectConversationPrompt")}
							</p>
						) : (
							<ActiveThreadPanel
								key={selected.id}
								conversationId={selected.id}
								peerAddress={selected.peer}
								myAddress={address}
								token={session.token}
								getConversationKey={getConversationKey}
								onMessagesChanged={() => {
									void loadConversations();
								}}
							/>
						)}
					</div>
				</section>
			)}
		</main>
	);
}
