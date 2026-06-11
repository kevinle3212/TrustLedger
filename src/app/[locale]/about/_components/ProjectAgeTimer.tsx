"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useVisibleTimestamp } from "@/hooks/useVisibleTimestamp";

const PROJECT_BIRTHDATE_MS = Date.parse("2026-05-02T00:00:00-07:00");

function ageParts(nowMs: number): {
	readonly days: number;
	readonly hours: number;
	readonly minutes: number;
	readonly seconds: number;
} {
	const elapsed = Math.max(0, nowMs - PROJECT_BIRTHDATE_MS);
	const totalSeconds = Math.floor(elapsed / 1000);
	const days = Math.floor(totalSeconds / 86_400);
	const hours = Math.floor((totalSeconds % 86_400) / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	return { days, hours, minutes, seconds };
}

export function ProjectAgeTimer(): React.JSX.Element {
	const t = useTranslations("About");
	const nowMs = useVisibleTimestamp(1000);
	const parts = useMemo(() => ageParts(nowMs), [nowMs]);

	const cells = [
		[t("timer.days"), parts.days, false],
		[t("timer.hours"), parts.hours, true],
		[t("timer.minutes"), parts.minutes, true],
		[t("timer.seconds"), parts.seconds, true],
	] as const;

	return (
		<div
			className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 dark:border-indigo-400/25 dark:bg-indigo-400/10"
			aria-live="polite"
		>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
						{t("timer.title")}
					</p>
					<p className="mt-1 text-sm text-indigo-950/75 dark:text-indigo-50/75">
						{t("timer.body")}
					</p>
				</div>
				<p className="font-mono text-xs text-indigo-900/70 dark:text-indigo-100/70">
					05/02/2026
				</p>
			</div>
			<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{cells.map(([label, value, pad]) => (
					<div
						key={label}
						className="rounded-xl border border-indigo-200/80 bg-white/70 px-3 py-3 text-center dark:border-indigo-300/15 dark:bg-gray-950/35"
					>
						<p className="font-mono text-2xl font-bold tabular-nums text-indigo-950 dark:text-white">
							{String(value).padStart(pad ? 2 : 1, "0")}
						</p>
						<p className="mt-1 text-xs font-semibold text-indigo-800/70 dark:text-indigo-100/70">
							{label}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
