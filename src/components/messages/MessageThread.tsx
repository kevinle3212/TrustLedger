"use client";

import { useTranslations } from "next-intl";

import { formatAddress } from "@/lib/utils";
import type { DecryptedMessage } from "@/components/messages/types";

/**
 * The active conversation's message list. Each message was already decrypted
 * (or marked as failed) by the parent; this component is presentation-only.
 *
 * @param myAddress - The signed-in wallet's address, to align sent messages.
 */
export function MessageThread({
	messages,
	myAddress,
}: {
	readonly messages: readonly DecryptedMessage[];
	readonly myAddress: string;
}): React.JSX.Element {
	const t = useTranslations("Messaging");

	if (messages.length === 0) {
		return <p className="text-sm text-gray-500 dark:text-gray-400">{t("emptyThread")}</p>;
	}

	return (
		<ul className="flex flex-col gap-3">
			{messages.map((message) => {
				const mine = message.senderAddress.toLowerCase() === myAddress.toLowerCase();
				return (
					<li
						key={message.id}
						className={`flex ${mine ? "justify-end" : "justify-start"}`}
					>
						<div
							className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-6 ${
								mine
									? "bg-indigo-600 text-white"
									: "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-gray-100"
							}`}
						>
							<p>{message.text ?? t("decryptError")}</p>
							{message.moderationFlag === "flag" && (
								<p
									className={`mt-1 text-xs ${mine ? "text-indigo-100" : "text-amber-700 dark:text-amber-300"}`}
								>
									{t("flagCategoriesLabel", {
										categories: message.moderationCategories.join(", "),
									})}
								</p>
							)}
							<p
								className={`mt-1 text-xs ${mine ? "text-indigo-100" : "text-gray-500 dark:text-gray-400"}`}
							>
								{mine
									? formatAddress(myAddress)
									: formatAddress(message.senderAddress)}{" "}
								· {new Date(message.createdAt).toLocaleString()}
							</p>
						</div>
					</li>
				);
			})}
		</ul>
	);
}
