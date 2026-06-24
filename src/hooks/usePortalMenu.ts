"use client";

import {
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type CSSProperties,
	type RefObject,
} from "react";

/** Delay before a hover-out closes the menu, so the pointer can cross the gap
 * between the trigger and the portaled menu without it snapping shut. */
const HOVER_CLOSE_DELAY_MS = 150;

// Hydration-safe "are we on the client yet?" flag. useSyncExternalStore returns
// the server snapshot (false) during SSR and the first client render, then the
// client snapshot (true) afterwards - without a setState-in-effect mounted flag.
// The portal can only target document.body once we are on the client.
const subscribeNoop = (): (() => void) => (): void => undefined;
function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		() => true,
		() => false,
	);
}

/** Which trigger edge the menu is pinned to horizontally. */
export type PortalMenuAlign = "left" | "right";

/** Fixed-position offsets resolved from the trigger's bounding box. */
interface PortalMenuPosition {
	readonly top: number;
	readonly left?: number;
	readonly right?: number;
}

export interface UsePortalMenuOptions {
	/** Pin the menu to the trigger's left or right edge. Defaults to `"right"`. */
	readonly align?: PortalMenuAlign;
}

export interface UsePortalMenuResult<
	TriggerElement extends HTMLElement,
	MenuElement extends HTMLElement,
> {
	/** True once running on the client; gate `createPortal` on this. */
	readonly mounted: boolean;
	/** Whether the menu is currently open. */
	readonly open: boolean;
	/** Attach to the trigger so positioning and outside-click detection work. */
	readonly triggerRef: RefObject<TriggerElement | null>;
	/** Attach to the portaled menu container. */
	readonly menuRef: RefObject<MenuElement | null>;
	/** `position: fixed` style anchored to the trigger; spread onto the menu. */
	readonly menuStyle: CSSProperties;
	/** Open the menu (cancels any pending hover-close). */
	readonly openMenu: () => void;
	/** Close the menu immediately. */
	readonly closeMenu: () => void;
	/** Toggle open/closed (used by click triggers). */
	readonly toggle: () => void;
	/** Begin the hover-close delay; only meaningful when `hover` is enabled. */
	readonly scheduleClose: () => void;
}

/**
 * Shared behavior for a dropdown rendered through a portal into `document.body`
 * with `position: fixed`. Consolidates the pattern first used by
 * `ConnectedWalletMenu`: navbar action bars and table rows are overflow
 * scrollers, and per the CSS overflow spec an `overflow-x` other than `visible`
 * forces `overflow-y` to `auto`, which clips an in-flow absolutely-positioned
 * dropdown. Portaling to the body with fixed coordinates escapes every
 * clipping/stacking ancestor so the menu is always visible.
 *
 * Handles: client-mount gating, open state, trigger-anchored fixed positioning
 * (re-measured on scroll/resize while open), outside-click and Escape close,
 * and hover-intent open/close via the returned `openMenu`/`scheduleClose`.
 *
 * @typeParam TriggerElement Element type the trigger ref is attached to.
 * @typeParam MenuElement Element type the menu ref is attached to.
 * @param options Alignment behavior. See {@link UsePortalMenuOptions}.
 */
export function usePortalMenu<
	TriggerElement extends HTMLElement = HTMLElement,
	MenuElement extends HTMLElement = HTMLElement,
>(options: UsePortalMenuOptions = {}): UsePortalMenuResult<TriggerElement, MenuElement> {
	const { align = "right" } = options;
	const mounted = useMounted();
	const [open, setOpen] = useState(false);
	const [position, setPosition] = useState<PortalMenuPosition>({ top: 0, right: 0 });
	const triggerRef = useRef<TriggerElement | null>(null);
	const menuRef = useRef<MenuElement | null>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearCloseTimer = useCallback((): void => {
		if (closeTimerRef.current !== null) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}
	}, []);

	const updatePosition = useCallback((): void => {
		const trigger = triggerRef.current;
		if (trigger === null) return;
		const rect = trigger.getBoundingClientRect();
		setPosition(
			align === "left"
				? { top: rect.bottom, left: Math.max(rect.left, 0) }
				: { top: rect.bottom, right: Math.max(window.innerWidth - rect.right, 0) },
		);
	}, [align]);

	// Hold the latest reposition handler in a ref so the scroll/resize listeners
	// subscribe once per open (not on every render) while still running current logic.
	const updatePositionRef = useRef(updatePosition);
	useEffect(() => {
		updatePositionRef.current = updatePosition;
	}, [updatePosition]);

	const openMenu = useCallback((): void => {
		clearCloseTimer();
		updatePosition();
		setOpen(true);
	}, [clearCloseTimer, updatePosition]);

	const closeMenu = useCallback((): void => {
		clearCloseTimer();
		setOpen(false);
	}, [clearCloseTimer]);

	const toggle = useCallback((): void => {
		if (open) {
			closeMenu();
		} else {
			openMenu();
		}
	}, [open, openMenu, closeMenu]);

	const scheduleClose = useCallback((): void => {
		clearCloseTimer();
		closeTimerRef.current = setTimeout(() => {
			setOpen(false);
			closeTimerRef.current = null;
		}, HOVER_CLOSE_DELAY_MS);
	}, [clearCloseTimer]);

	// Tear down the pending hover-close timer on unmount so it never fires
	// against an unmounted component.
	useEffect(() => clearCloseTimer, [clearCloseTimer]);

	// Keep the menu anchored to the trigger while it is open and the page moves.
	useEffect(() => {
		if (!open) return;
		const reposition = (): void => {
			updatePositionRef.current();
		};
		reposition();
		window.addEventListener("scroll", reposition, true);
		window.addEventListener("resize", reposition);
		return (): void => {
			window.removeEventListener("scroll", reposition, true);
			window.removeEventListener("resize", reposition);
		};
	}, [open]);

	// Close on outside click / Escape. The menu lives in a portal, so "inside"
	// means either the trigger or the menu subtree.
	useEffect(() => {
		function closeOnOutsideClick(event: MouseEvent): void {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (triggerRef.current?.contains(target) === true) return;
			if (menuRef.current?.contains(target) === true) return;
			closeMenu();
		}

		function closeOnEscape(event: KeyboardEvent): void {
			if (event.key === "Escape") {
				closeMenu();
			}
		}

		document.addEventListener("mousedown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return (): void => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [closeMenu]);

	const menuStyle: CSSProperties = {
		position: "fixed",
		top: position.top,
		...(position.left !== undefined ? { left: position.left } : {}),
		...(position.right !== undefined ? { right: position.right } : {}),
	};

	return {
		mounted,
		open,
		triggerRef,
		menuRef,
		menuStyle,
		openMenu,
		closeMenu,
		toggle,
		scheduleClose,
	};
}
