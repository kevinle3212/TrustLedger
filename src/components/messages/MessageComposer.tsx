"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Send-box states surfaced to the user around moderation and network errors. */
export type ComposerNotice =
	| { readonly kind: "blocked"; readonly reason: string | undefined }
	| { readonly kind: "error"; readonly message: string }
	| null;

/**
 * The message compose box: plaintext input plus the send button. Moderation
 * and encryption happen in the parent (`onSend`); this component only owns the
 * draft text and disables itself while a send is in flight.
 */
export function MessageComposer({
	onSend,
	sending,
	notice,
}: {
	readonly onSend: (text: string) => void;
	readonly sending: boolean;
	readonly notice: ComposerNotice;
}): React.JSX.Element {
	const t = useTranslations("Messaging");
	const [draft, setDraft] = useState("");

	function submit(): void {
		const trimmed = draft.trim();
		if (trimmed === "" || sending) return;
		onSend(trimmed);
		setDraft("");
	}

	return (
		<div className="flex flex-col gap-2">
			{notice?.kind === "blocked" && (
				<p role="alert" className="text-sm text-red-600 dark:text-red-400">
					{t("moderationBlocked", { reason: notice.reason ?? "" })}
				</p>
			)}
			{notice?.kind === "error" && (
				<p role="alert" className="text-sm text-red-600 dark:text-red-400">
					{notice.message}
				</p>
			)}
			<form
				className="flex gap-2"
				action={() => {
					submit();
				}}
			>
				<label htmlFor="messages-composer" className="sr-only">
					{t("composerPlaceholder")}
				</label>
				<input
					id="messages-composer"
					type="text"
					placeholder={t("composerPlaceholder")}
					value={draft}
					disabled={sending}
					onChange={(event) => {
						setDraft(event.target.value);
					}}
					className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
				/>
				<button
					type="submit"
					disabled={sending || draft.trim() === ""}
					className="tl-button-motion inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{t("sendButton")}
				</button>
			</form>
		</div>
	);
}
