"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { formatAddress } from "@/lib/utils";
import type { ConversationSummary } from "@/components/messages/types";

/**
 * Left pane of the messages page: the wallet's conversations plus a form to
 * open (or resume) a conversation by wallet address.
 */
export function ConversationList({
	conversations,
	selectedId,
	onSelect,
	onOpenByAddress,
}: {
	readonly conversations: readonly ConversationSummary[];
	readonly selectedId: string | null;
	readonly onSelect: (id: string) => void;
	readonly onOpenByAddress: (address: string) => void;
}): React.JSX.Element {
	const t = useTranslations("Messaging");
	const [address, setAddress] = useState("");

	return (
		<div className="flex flex-col gap-4">
			<form
				className="flex flex-col gap-2"
				action={() => {
					const trimmed = address.trim();
					if (trimmed === "") return;
					onOpenByAddress(trimmed);
					setAddress("");
				}}
			>
				<label htmlFor="messages-open-by-address" className="sr-only">
					{t("openByAddressLabel")}
				</label>
				<div className="flex gap-2">
					<input
						id="messages-open-by-address"
						type="text"
						placeholder={t("openByAddressPlaceholder")}
						value={address}
						onChange={(event) => {
							setAddress(event.target.value);
						}}
						className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
					/>
					<button
						type="submit"
						disabled={address.trim() === ""}
						className="tl-button-motion inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t("openByAddressButton")}
					</button>
				</div>
			</form>

			<h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
				{t("conversationsTitle")}
			</h2>
			{conversations.length === 0 ? (
				<p className="text-sm text-gray-500 dark:text-gray-400">{t("noConversations")}</p>
			) : (
				<ul className="flex flex-col gap-1">
					{conversations.map((conversation) => (
						<li key={conversation.id}>
							<button
								type="button"
								aria-current={conversation.id === selectedId ? "true" : undefined}
								onClick={() => {
									onSelect(conversation.id);
								}}
								className={`tl-button-motion flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium ${
									conversation.id === selectedId
										? "bg-indigo-50 text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-100"
										: "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
								}`}
							>
								<span className="truncate font-mono">
									{formatAddress(conversation.peer)}
								</span>
								{conversation.unread > 0 && (
									<span className="ml-2 inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-semibold text-white">
										{conversation.unread}
									</span>
								)}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
