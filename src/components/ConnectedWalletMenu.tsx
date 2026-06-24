"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatAddress } from "@/lib/utils";
import { copyToClipboard } from "@/security";
import { usePortalMenu } from "@/hooks/usePortalMenu";

/** Clipboard "copy" glyph. */
function CopyIcon(): React.JSX.Element {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

/** Checkmark glyph shown briefly after a successful copy. */
function CheckIcon(): React.JSX.Element {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

interface MenuLink {
	href: string;
	labelKey: string;
}

const MENU_LINKS: readonly MenuLink[] = [
	{ href: "/dashboard", labelKey: "dashboard" },
	{ href: "/analytics", labelKey: "analytics" },
	{ href: "/create", labelKey: "createContract" },
	{ href: "/reputation", labelKey: "reputation" },
	{ href: "/account", labelKey: "account" },
	{ href: "/status", labelKey: "status" },
	{ href: "/about", labelKey: "about" },
];

/**
 * Connected-wallet control: the truncated address (toggles a navigation menu),
 * a copy-to-clipboard button, and a dropdown linking to the wallet-safe routes
 * plus a "Manage Wallet" action.
 *
 * The dropdown is rendered through a {@link createPortal} into `document.body`
 * with `position: fixed`. This is deliberate: the navbar action bar is a
 * horizontal scroller (`overflow-x-auto`), and per the CSS overflow spec that
 * forces `overflow-y` to `auto`, which clips an in-flow absolutely-positioned
 * dropdown. Portaling to the body escapes every clipping/stacking ancestor so
 * the menu is actually visible on hover/click.
 *
 * @param address Connected EOA address shown (truncated) and copied in full.
 * @param compact Tightens horizontal padding for the navbar layout.
 * @param onManageWallet Invoked by the "Manage Wallet" item (opens AppKit).
 */
export function ConnectedWalletMenu({
	address,
	compact = false,
	onManageWallet,
}: {
	address: `0x${string}`;
	compact?: boolean;
	onManageWallet: () => void;
}): React.JSX.Element {
	const t = useTranslations("Common");
	const {
		mounted,
		open: walletMenuOpen,
		triggerRef,
		menuRef,
		menuStyle,
		openMenu: openWalletMenu,
		closeMenu: closeWalletMenu,
		toggle: toggleWalletMenu,
		scheduleClose,
	} = usePortalMenu<HTMLDivElement, HTMLDivElement>();
	const [copied, setCopied] = useState(false);
	const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearCopyFeedbackTimer = useCallback((): void => {
		if (copyFeedbackTimerRef.current !== null) {
			clearTimeout(copyFeedbackTimerRef.current);
			copyFeedbackTimerRef.current = null;
		}
	}, []);

	// Tear down the copy-feedback timer on unmount so a pending callback never
	// fires against an unmounted component.
	useEffect(() => clearCopyFeedbackTimer, [clearCopyFeedbackTimer]);

	function copyAddress(): void {
		// copyToClipboard is best-effort and never throws/rejects (safe on insecure
		// origins and in-app webviews where navigator.clipboard is undefined).
		void copyToClipboard(address).then((ok) => {
			if (!ok) return;
			setCopied(true);
			clearCopyFeedbackTimer();
			copyFeedbackTimerRef.current = setTimeout(() => {
				setCopied(false);
				copyFeedbackTimerRef.current = null;
			}, 1500);
		});
	}

	function manageWallet(): void {
		closeWalletMenu();
		onManageWallet();
	}

	const menuVisibility = walletMenuOpen
		? "pointer-events-auto translate-y-0 opacity-100"
		: "pointer-events-none translate-y-1 opacity-0";

	const menu = (
		<div
			ref={menuRef}
			role="menu"
			tabIndex={-1}
			aria-label={t("walletMenu")}
			style={menuStyle}
			onPointerEnter={openWalletMenu}
			onMouseEnter={openWalletMenu}
			onPointerLeave={scheduleClose}
			onMouseLeave={scheduleClose}
			className={`z-[60] w-64 pt-2 transition duration-150 ease-out ${menuVisibility}`}
		>
			<div className="rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg shadow-gray-950/10 dark:border-white/10 dark:bg-gray-950 dark:text-white">
				{MENU_LINKS.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						role="menuitem"
						onClick={closeWalletMenu}
						className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
					>
						<span>{t(link.labelKey)}</span>
						<span aria-hidden="true">→</span>
					</Link>
				))}
				<button
					type="button"
					role="menuitem"
					onClick={manageWallet}
					className="tl-button-motion mt-1 flex min-h-10 w-full items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-sm font-semibold text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-100 dark:hover:bg-indigo-400/20"
				>
					<span>{t("manageWallet")}</span>
					<span aria-hidden="true">↗</span>
				</button>
				<p className="px-3 pb-2 pt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
					{t("walletMenuHint")}
				</p>
			</div>
		</div>
	);

	return (
		<div
			ref={triggerRef}
			className="relative max-w-full shrink-0"
			onPointerEnter={openWalletMenu}
			onMouseEnter={openWalletMenu}
			onPointerLeave={scheduleClose}
			onMouseLeave={scheduleClose}
			onFocus={openWalletMenu}
		>
			<div className="grid max-w-full grid-cols-[minmax(0,1fr)_2.5rem] items-stretch overflow-hidden rounded-lg bg-indigo-600 text-white sm:inline-grid sm:grid-cols-[minmax(0,1fr)_2.75rem]">
				<button
					type="button"
					onClick={toggleWalletMenu}
					aria-haspopup="menu"
					aria-expanded={walletMenuOpen}
					aria-label={t("connectedAs", { address })}
					className={`tl-button-motion inline-flex min-h-10 min-w-0 items-center justify-center py-2 font-mono text-sm font-semibold hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-11 ${
						compact ? "px-3 sm:px-3.5" : "px-4 sm:px-5"
					}`}
				>
					<span aria-hidden="true" className="truncate">
						{formatAddress(address)}
					</span>
				</button>
				<button
					type="button"
					onClick={copyAddress}
					aria-label={copied ? t("addressCopied") : t("copyWalletAddress")}
					title={copied ? t("copied") : t("copyAddress")}
					className="tl-button-motion inline-flex min-h-10 w-10 shrink-0 items-center justify-center border-l border-white/20 text-white/90 hover:bg-indigo-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-11 sm:w-11"
				>
					{copied ? <CheckIcon /> : <CopyIcon />}
				</button>
			</div>
			{mounted ? createPortal(menu, document.body) : null}
		</div>
	);
}
