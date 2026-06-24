"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { usePortalMenu } from "@/hooks/usePortalMenu";
import { NAV_LINKS } from "@/components/nav-links";

/** Hamburger glyph shown when the menu is closed. */
function MenuIcon(): React.JSX.Element {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	);
}

/** Close (X) glyph shown when the menu is open. */
function CloseIcon(): React.JSX.Element {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M18 6 6 18M6 6l12 12" />
		</svg>
	);
}

/**
 * Mobile primary-navigation menu: a hamburger trigger that reveals the main nav
 * links through {@link usePortalMenu}. The menu is portaled into `document.body`
 * with `position: fixed` so the sticky navbar's `overflow-x-auto` scroller
 * cannot clip it — the same consolidated pattern used by `ConnectedWalletMenu`.
 *
 * Intended for small screens; hide it at the breakpoint where the inline nav
 * becomes visible (see `Navbar`).
 */
export function MobileNavMenu(): React.JSX.Element {
	const t = useTranslations("Nav");
	const path = usePathname();
	const { mounted, open, triggerRef, menuRef, menuStyle, toggle, closeMenu } = usePortalMenu<
		HTMLButtonElement,
		HTMLDivElement
	>();

	const menuVisibility = open
		? "pointer-events-auto translate-y-0 opacity-100"
		: "pointer-events-none translate-y-1 opacity-0";

	const menu = (
		<div
			ref={menuRef}
			role="menu"
			tabIndex={-1}
			aria-label={t("mainNav")}
			style={menuStyle}
			className={`z-[60] w-64 pt-2 transition duration-150 ease-out ${menuVisibility}`}
		>
			<div className="rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg shadow-gray-950/10 dark:border-white/10 dark:bg-gray-950 dark:text-white">
				{NAV_LINKS.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						role="menuitem"
						aria-current={path === link.href ? "page" : undefined}
						onClick={closeMenu}
						className={`tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
							path === link.href
								? "bg-gray-100 text-gray-900 dark:bg-white/10 dark:text-white"
								: "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
						}`}
					>
						<span>{t(link.labelKey)}</span>
						<span aria-hidden="true">→</span>
					</Link>
				))}
			</div>
		</div>
	);

	return (
		<div className="shrink-0">
			<button
				ref={triggerRef}
				type="button"
				onClick={toggle}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={open ? t("closeMenu") : t("openMenu")}
				className="tl-button-motion inline-flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
			>
				{open ? <CloseIcon /> : <MenuIcon />}
			</button>
			{mounted ? createPortal(menu, document.body) : null}
		</div>
	);
}
