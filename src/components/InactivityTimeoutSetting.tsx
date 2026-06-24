"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
	DEFAULT_INACTIVITY_TIMEOUT_MS,
	INACTIVITY_TIMEOUT_OPTIONS,
	readInactivityTimeoutMs,
	subscribeInactivityTimeout,
	writeInactivityTimeoutMs,
} from "@/lib/accountPreferences";

/**
 * Dropdown that persists the user's preferred wallet inactivity timeout. Uses
 * the shared `tl-choice-menu` styling so it stays consistent with the other
 * custom dropdowns across the UI instead of a native `<select>`.
 */
export function InactivityTimeoutSetting(): React.JSX.Element {
	const t = useTranslations("Account");
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const value = useSyncExternalStore(
		subscribeInactivityTimeout,
		readInactivityTimeoutMs,
		() => DEFAULT_INACTIVITY_TIMEOUT_MS,
	);
	const selected =
		INACTIVITY_TIMEOUT_OPTIONS.find((option) => option.ms === value) ??
		INACTIVITY_TIMEOUT_OPTIONS[2];

	useEffect(() => {
		function closeOnOutsideClick(event: MouseEvent): void {
			if (
				rootRef.current !== null &&
				event.target instanceof Node &&
				!rootRef.current.contains(event.target)
			) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", closeOnOutsideClick);
		return (): void => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
		};
	}, []);

	function selectTimeout(ms: number): void {
		writeInactivityTimeoutMs(ms);
		setOpen(false);
	}

	return (
		<div>
			<span
				id="inactivity-timeout-label"
				className="block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				{t("autoLogoutLabel")}
			</span>
			<div ref={rootRef} className="tl-choice-menu mt-2">
				<button
					type="button"
					aria-haspopup="menu"
					aria-expanded={open}
					aria-labelledby="inactivity-timeout-label"
					className="tl-choice-menu__button"
					onClick={() => {
						setOpen((current) => !current);
					}}
					onKeyDown={(event) => {
						if (event.key === "Escape") setOpen(false);
					}}
				>
					<span className="tl-choice-menu__main">
						<span className="tl-choice-menu__label">{t(selected.labelKey)}</span>
					</span>
					<span className="tl-choice-menu__chevron" aria-hidden="true">
						⌄
					</span>
				</button>
				{open && (
					<ul className="tl-choice-menu__menu" aria-label={t("autoLogoutLabel")}>
						{INACTIVITY_TIMEOUT_OPTIONS.map((option) => {
							const isSelected = option.ms === value;
							return (
								<li key={option.ms}>
									<button
										type="button"
										aria-current={isSelected ? "true" : undefined}
										className="tl-choice-menu__option"
										onClick={() => {
											selectTimeout(option.ms);
										}}
									>
										<span className="tl-choice-menu__option-label">
											{t(option.labelKey)}
										</span>
										<span className="tl-choice-menu__check" aria-hidden="true">
											{isSelected ? "✓" : ""}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				)}
			</div>
			<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("autoLogoutNote")}</p>
		</div>
	);
}
