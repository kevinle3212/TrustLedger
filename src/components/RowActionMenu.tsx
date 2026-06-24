"use client";

import { Children, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePortalMenu, type PortalMenuAlign } from "@/hooks/usePortalMenu";

/** Horizontal "kebab" (three-dot) glyph for the overflow trigger. */
function KebabIcon(): React.JSX.Element {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<circle cx="5" cy="12" r="2" />
			<circle cx="12" cy="12" r="2" />
			<circle cx="19" cy="12" r="2" />
		</svg>
	);
}

/**
 * Portal-based overflow menu for row-level actions (dashboard contract cards,
 * dispute action panels). Collapses a set of action controls behind a kebab
 * trigger so a row never grows tall on small screens, and renders the panel
 * through {@link usePortalMenu} into `document.body` with `position: fixed` so
 * the surrounding card/list overflow cannot clip it.
 *
 * This is the WAI-ARIA disclosure pattern, not `role="menu"`: the panel holds
 * arbitrary interactive controls (transaction buttons with their own busy
 * state), which a strict menu may not contain. Navigation menus that list links
 * use `role="menu"` instead (see `ConnectedWalletMenu`).
 *
 * Renders nothing when no actions are supplied, so callers can pass the same
 * conditional action set they rendered inline and the trigger only appears when
 * at least one action applies.
 *
 * @param label Accessible name for the trigger and the panel.
 * @param children Action controls; falsy/empty children suppress the trigger.
 * @param align Edge the panel is pinned to. Defaults to `"right"`.
 */
export function RowActionMenu({
	label,
	children,
	align = "right",
}: {
	label: string;
	children: ReactNode;
	align?: PortalMenuAlign;
}): React.JSX.Element | null {
	const panelId = useId();
	const { mounted, open, triggerRef, menuRef, menuStyle, toggle } = usePortalMenu<
		HTMLButtonElement,
		HTMLDivElement
	>({ align });

	// Flatten so fragments/conditionals collapse and falsy branches drop out;
	// with no real actions there is nothing to reveal, so render nothing.
	const items = Children.toArray(children);
	if (items.length === 0) return null;

	const panelVisibility = open
		? "pointer-events-auto translate-y-0 opacity-100"
		: "pointer-events-none translate-y-1 opacity-0";

	const panel = (
		<div
			ref={menuRef}
			id={panelId}
			style={menuStyle}
			className={`z-[60] w-56 pt-2 transition duration-150 ease-out ${panelVisibility}`}
		>
			<div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg shadow-gray-950/10 dark:border-white/10 dark:bg-gray-950 dark:text-white [&_button]:w-full [&_button]:justify-center">
				{items}
			</div>
		</div>
	);

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				onClick={toggle}
				aria-haspopup="true"
				aria-expanded={open}
				aria-controls={panelId}
				aria-label={label}
				className="tl-button-motion inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
			>
				<KebabIcon />
			</button>
			{mounted ? createPortal(panel, document.body) : null}
		</>
	);
}
