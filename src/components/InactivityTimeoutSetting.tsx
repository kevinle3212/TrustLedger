"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
	DEFAULT_INACTIVITY_TIMEOUT_MS,
	INACTIVITY_TIMEOUT_OPTIONS,
	readInactivityTimeoutMs,
	subscribeInactivityTimeout,
	writeInactivityTimeoutMs,
} from "@/lib/accountPreferences";

/** Persists the chosen timeout. Module-scoped: it holds no component state. */
function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
	writeInactivityTimeoutMs(Number(e.target.value));
}

/** Select control that persists the user's preferred wallet inactivity timeout. */
export function InactivityTimeoutSetting(): React.JSX.Element {
	const t = useTranslations("Account");
	const value = useSyncExternalStore(
		subscribeInactivityTimeout,
		readInactivityTimeoutMs,
		() => DEFAULT_INACTIVITY_TIMEOUT_MS,
	);

	return (
		<div>
			<label
				htmlFor="inactivity-timeout"
				className="block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				{t("autoLogoutLabel")}
			</label>
			<select
				id="inactivity-timeout"
				value={value}
				onChange={handleChange}
				className="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
			>
				{INACTIVITY_TIMEOUT_OPTIONS.map(({ ms, label }) => (
					<option key={ms} value={ms}>
						{label}
					</option>
				))}
			</select>
			<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("autoLogoutNote")}</p>
		</div>
	);
}
